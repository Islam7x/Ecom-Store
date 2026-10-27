const Order = require("../../models/Order");
const { safeSearchPattern } = require("../../lib/query");
const {
  REVENUE_ORDER_STATUSES,
  cancelPendingOrder,
  statusEvent,
} = require("../../lib/orderLifecycle");

// GET /api/admin/orders
exports.getAllOrders = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.user) filter.user = req.query.user;

  const searchPattern = safeSearchPattern(req.query.search);
  if (searchPattern) {
    filter.$or = [
      { stripeSessionId: { $regex: searchPattern, $options: "i" } },
      { checkoutKey: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email picture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, page, pages: Math.ceil(total / limit), total });
};

// GET /api/admin/orders/:id
exports.getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email picture",
  );
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
};

// PUT /api/admin/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status === "pending" && status === "cancelled") {
    const cancelled = await cancelPendingOrder(order._id, {
      actor: "admin",
      note: "Cancelled by store staff",
    });
    return res.json(cancelled);
  }

  const transitions = {
    paid: ["shipped"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  const allowed = transitions[order.status] || [];

  if (!allowed.includes(status)) {
    const message =
      order.status === "pending" && status === "paid"
        ? "Payment is confirmed only by a verified Stripe webhook"
        : `Cannot transition from "${order.status}" to "${status}". Allowed: ${allowed.join(", ") || "none"}`;
    return res.status(400).json({ message });
  }

  order.status = status;
  if (status === "shipped") order.shippedAt = new Date();
  if (status === "delivered") order.deliveredAt = new Date();
  order.statusHistory.push(
    statusEvent(status, "admin", `Marked as ${status} by store staff`),
  );
  await order.save();
  res.json(order);
};

// PUT /api/admin/orders/:id/shipping-address
exports.updateShippingAddress = async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["pending", "paid"] } },
    { $set: { shippingAddress: req.body } },
    { returnDocument: "after", runValidators: true },
  );

  if (!order) {
    return res.status(409).json({
      message: "Shipping addresses can only be changed before an order ships",
    });
  }

  res.json({ message: "Shipping address updated", order });
};

// DELETE /api/admin/orders/:id
exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).select("status");
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (order.status !== "pending") {
    return res.status(400).json({
      message:
        "Only unpaid checkout reservations can be cancelled here. Paid orders require a refund workflow.",
    });
  }

  const cancelled = await cancelPendingOrder(order._id, {
    actor: "admin",
    note: "Cancelled by store staff",
  });
  res.json({ message: "Checkout reservation cancelled and stock released", order: cancelled });
};

// GET /api/admin/orders/stats/summary
exports.getOrderStats = async (_req, res) => {
  const paidMatch = { status: { $in: REVENUE_ORDER_STATUSES } };
  const [statusBreakdown, paidValues] = await Promise.all([
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: paidMatch },
      { $group: { _id: null, total: { $sum: "$total" }, avg: { $avg: "$total" } } },
    ]),
  ]);

  const breakdown = {};
  statusBreakdown.forEach((item) => {
    breakdown[item._id] = item.count;
  });

  res.json({
    statusBreakdown: breakdown,
    totalValue: paidValues[0]?.total || 0,
    avgOrderValue: paidValues[0]?.avg || 0,
  });
};
