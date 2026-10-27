// server/controllers/admin/userController.js
const User = require("../../models/User");
const Order = require("../../models/Order");
const { REVENUE_ORDER_STATUSES } = require("../../lib/orderLifecycle");

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;
    const { search, isAdmin } = req.query;

    const filter = {};

    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by admin status
    if (isAdmin !== undefined) {
      filter.isAdmin = isAdmin === "true";
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Get order count for each user
    const userIds = users.map((u) => u._id);
    const orderCounts = await Order.aggregate([
      {
        $match: {
          user: { $in: userIds },
          status: { $in: REVENUE_ORDER_STATUSES },
        },
      },
      {
        $group: { _id: "$user", count: { $sum: 1 }, total: { $sum: "$total" } },
      },
    ]);

    const orderCountMap = {};
    orderCounts.forEach((oc) => {
      orderCountMap[oc._id.toString()] = { orders: oc.count, spent: oc.total };
    });

    const enrichedUsers = users.map((user) => ({
      ...user,
      orders: orderCountMap[user._id.toString()]?.orders || 0,
      totalSpent: orderCountMap[user._id.toString()]?.spent || 0,
    }));

    res.json({
      users: enrichedUsers,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/users/:id
 * Get a specific user's details
 */
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's orders
    const orders = await Order.find({
      user: req.params.id,
      status: { $in: REVENUE_ORDER_STATUSES },
    })
      .select("_id total status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
      avgOrderValue:
        orders.length > 0
          ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
          : 0,
    };

    res.json({
      user,
      stats,
      recentOrders: orders.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT /api/admin/users/:id/role
 * Update user's admin role
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { isAdmin } = req.body;

    if (typeof isAdmin !== "boolean") {
      return res.status(400).json({ message: "isAdmin must be a boolean" });
    }

    // Prevent removing your own admin status
    if (!isAdmin && req.user._id.toString() === req.params.id) {
      return res
        .status(400)
        .json({ message: "You cannot remove your own admin status" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User role updated to ${isAdmin ? "admin" : "customer"}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete/deactivate a user account (soft delete)
 */
exports.deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.user._id.toString() === req.params.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User account deleted successfully",
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/users/reports/customer-segments
 * Get customer segmentation analysis
 */
exports.getCustomerSegments = async (req, res) => {
  try {
    const segments = await Order.aggregate([
      { $match: { status: { $in: REVENUE_ORDER_STATUSES } } },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$total" },
          orderCount: { $sum: 1 },
          lastOrder: { $max: "$createdAt" },
        },
      },
      {
        $bucket: {
          groupBy: "$totalSpent",
          boundaries: [0, 100, 500, 1000, 5000, 50000],
          default: "High Value",
          output: {
            count: { $sum: 1 },
            avgSpent: { $avg: "$totalSpent" },
          },
        },
      },
    ]);

    res.json({ segments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
