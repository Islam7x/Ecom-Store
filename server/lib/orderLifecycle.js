const Order = require("../models/Order");
const Product = require("../models/Product");
const { withTransaction, withSession } = require("./transactionHelper");

const REVENUE_ORDER_STATUSES = ["paid", "shipped", "delivered"];

const statusEvent = (status, actor, note) => ({
  status,
  actor,
  note,
  at: new Date(),
});

/**
 * Cancels a pending checkout and releases its inventory exactly once. The
 * guarded state transition acts as the claim, so webhook retries and the
 * reservation sweeper cannot release the same stock twice.
 */
async function cancelPendingOrder(orderId, { actor = "system", note } = {}) {
  return withTransaction(async (session) => {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: "pending" },
      {
        $set: { status: "cancelled", cancelledAt: new Date() },
        $push: { statusHistory: statusEvent("cancelled", actor, note) },
      },
      withSession(session, { returnDocument: "after" }),
    );

    if (!order) return null;

    for (const item of order.items) {
      const result = await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        withSession(session),
      );

      if (result.matchedCount !== 1) {
        throw new Error(
          `Unable to release inventory: product ${item.product} no longer exists`,
        );
      }
    }

    return order;
  });
}

/** Release reservations whose hosted payment session has expired. */
async function releaseExpiredReservations(now = new Date()) {
  const orders = await Order.find({
    status: "pending",
    reservationExpiresAt: { $lte: now },
  })
    .select("_id")
    .lean();

  let released = 0;
  for (const order of orders) {
    const cancelled = await cancelPendingOrder(order._id, {
      actor: "system",
      note: "Checkout reservation expired",
    });
    if (cancelled) released += 1;
  }

  return released;
}

module.exports = {
  REVENUE_ORDER_STATUSES,
  statusEvent,
  cancelPendingOrder,
  releaseExpiredReservations,
};
