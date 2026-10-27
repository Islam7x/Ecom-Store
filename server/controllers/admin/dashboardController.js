// server/controllers/admin/dashboardController.js
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const User = require("../../models/User");
const { REVENUE_ORDER_STATUSES } = require("../../lib/orderLifecycle");

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics and analytics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const revenueMatch = { status: { $in: REVENUE_ORDER_STATUSES } };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all necessary data in parallel
    const [
      totalOrders,
      totalRevenue,
      totalProducts,
      totalUsers,
      totalAdmins,
      todayOrders,
      todayRevenue,
      last30DaysOrders,
      last30DaysRevenue,
      ordersByStatus,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(revenueMatch),
      Order.aggregate([
        { $match: revenueMatch },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Product.countDocuments(),
      User.countDocuments({ isAdmin: false }),
      User.countDocuments({ isAdmin: true }),
      Order.countDocuments({ ...revenueMatch, createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.countDocuments({
        ...revenueMatch,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Order.aggregate([
        { $match: { ...revenueMatch, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Product.find({ stock: { $lt: 10, $gt: 0 } })
        .select("_id name stock")
        .limit(5),
      Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Format revenue data
    const totalRevenueAmount = totalRevenue[0]?.total || 0;
    const todayRevenueAmount = todayRevenue[0]?.total || 0;
    const last30DaysRevenueAmount = last30DaysRevenue[0]?.total || 0;

    // Format order status breakdown
    const statusBreakdown = {
      pending: 0,
      paid: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    ordersByStatus.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(statusBreakdown, item._id)) {
        statusBreakdown[item._id] = item.count;
      }
    });

    res.json({
      overview: {
        totalOrders,
        totalRevenue: totalRevenueAmount,
        totalProducts,
        totalCustomers: totalUsers,
        totalAdmins,
      },
      today: {
        orders: todayOrders,
        revenue: todayRevenueAmount,
      },
      last30Days: {
        orders: last30DaysOrders,
        revenue: last30DaysRevenueAmount,
      },
      orderStatus: statusBreakdown,
      alerts: {
        lowStockProducts: lowStockProducts.length,
        lowStockItems: lowStockProducts,
      },
      recentOrders: recentOrders.map((order) => ({
        _id: order._id,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        customer: order.user?.name || "Guest",
        email: order.user?.email || "N/A",
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/dashboard/sales
 * Get sales analytics for the specified period
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { period = "30days" } = req.query; // 7days, 30days, 90days, 1year, all

    let dateFilter;
    const now = new Date();

    switch (period) {
      case "7days":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1year":
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(0); // all time
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          status: { $in: REVENUE_ORDER_STATUSES },
          createdAt: { $gte: dateFilter },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    res.json({ period, data: salesData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/dashboard/top-products
 * Get best-selling and top-revenue products
 */
exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Order.aggregate([
      { $match: { status: { $in: REVENUE_ORDER_STATUSES } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ]);

    res.json({
      topProducts: topProducts.map((item) => ({
        productId: item._id,
        productName: item.product.name,
        totalSold: item.totalSold,
        totalRevenue: item.totalRevenue,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/admin/dashboard/inventory-summary
 * Get inventory summary and stock levels
 */
exports.getInventorySummary = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const outOfStock = await Product.countDocuments({ stock: 0 });
    const lowStock = await Product.countDocuments({
      stock: { $gt: 0, $lt: 10 },
    });
    const adequateStock = await Product.countDocuments({ stock: { $gte: 10 } });

    const totalStockValue = await Product.aggregate([
      {
        $group: {
          _id: null,
          value: { $sum: { $multiply: ["$price", "$stock"] } },
        },
      },
    ]);

    res.json({
      totalProducts,
      outOfStock,
      lowStock,
      adequateStock,
      totalStockValue: totalStockValue[0]?.value || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
