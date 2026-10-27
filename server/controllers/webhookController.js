// server/controllers/webhookController.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const { cancelPendingOrder, statusEvent } = require("../lib/orderLifecycle");

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ──────────────────────────────────────────────
// POST /api/webhook
// Stripe sends events here after payment events.
// The route must use express.raw() — NOT express.json().
// ──────────────────────────────────────────────
exports.handleStripeWebhook = async (req, res) => {
  let event;

  // ── 1. Verify signature ────────────────────
  if (endpointSecret) {
    const sig = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("⚠️  Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }
  } else {
    // No secret configured — parse body directly (dev mode only)
    console.warn(
      "⚠️  STRIPE_WEBHOOK_SECRET not set — skipping signature verification",
    );
    event = req.body;
  }

  // ── 2. Handle event types ──────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Card payments are complete here. For delayed methods, Stripe sends a
      // later async_payment_succeeded event instead.
      if (!session.payment_status || session.payment_status === "paid") {
        await handleCheckoutCompleted(session);
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      await handleCheckoutExpired(session);
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      await handleCheckoutExpired(session, "Payment failed");
      break;
    }

    default:
      // Unhandled event type — acknowledge it silently
      break;
  }

  // Always respond 200 so Stripe doesn't retry
  res.json({ received: true });
};

// ──────────────────────────────────────────────
// Handle successful payment
// ──────────────────────────────────────────────
async function handleCheckoutCompleted(session) {
  const order = await Order.findOneAndUpdate(
    { stripeSessionId: session.id, status: "pending" },
    {
      $set: { status: "paid", paidAt: new Date() },
      $push: {
        statusHistory: statusEvent(
          "paid",
          "payment",
          "Stripe confirmed payment",
        ),
      },
    },
    { returnDocument: "after" },
  );

  if (!order) {
    const knownOrder = await Order.findOne({ stripeSessionId: session.id })
      .select("_id status")
      .lean();
    if (knownOrder) {
      console.log(
        `Webhook: order ${knownOrder._id} already transitioned to ${knownOrder.status}`,
      );
    } else {
      console.error(`Webhook: no order found for session ${session.id}`);
    }
    return;
  }

  console.log(`✅ Order ${order._id} marked as paid via webhook`);
}

// ──────────────────────────────────────────────
// Handle expired checkout (release reserved stock)
// Uses transaction: stock release + order status update must both succeed
// ──────────────────────────────────────────────
async function handleCheckoutExpired(session, reason = "Stripe checkout session expired") {
  const order = await Order.findOne({ stripeSessionId: session.id });

  if (!order || order.status !== "pending") {
    return;
  }

  try {
    const cancelledOrder = await cancelPendingOrder(order._id, {
      actor: "payment",
      note: reason,
    });

    if (!cancelledOrder) return;

    console.log(
      `⏰ Order ${order._id} cancelled — stock released (session expired)`,
    );
  } catch (error) {
    console.error(
      `❌ Error cancelling order ${order._id} on session expiry:`,
      error.message,
    );
    // If transaction fails, stock and order state remain consistent
    // (either both succeed or both rollback)
  }
}
