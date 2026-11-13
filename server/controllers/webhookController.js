const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Coupon = require("../models/Coupon");
const { cancelPendingOrder, statusEvent } = require("../lib/orderLifecycle");
const { withTransaction, withSession } = require("../lib/transactionHelper");
const logger = require("../lib/logger");
const { sendMail } = require("../lib/mailer");
const User = require("../models/User");

const verifyStripeEvent = (req) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const allowInsecureDev =
    process.env.NODE_ENV === "development" && !endpointSecret;

  if (allowInsecureDev) {
    logger.warn("Stripe webhook signature verification skipped in development");
    return typeof req.body === "string" || Buffer.isBuffer(req.body)
      ? JSON.parse(req.body)
      : req.body;
  }

  if (!endpointSecret) {
    const error = new Error("STRIPE_WEBHOOK_SECRET is not configured");
    error.status = 500;
    throw error;
  }

  const signature = req.headers["stripe-signature"];
  return stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
};

exports.handleStripeWebhook = async (req, res) => {
  let event;

  try {
    event = verifyStripeEvent(req);
  } catch (err) {
    logger.error("Webhook signature verification failed", {
      error: err.message,
    });
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (!session.payment_status || session.payment_status === "paid") {
        await handleCheckoutCompleted(session);
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      await handleCheckoutCompleted(event.data.object);
      break;
    }

    case "checkout.session.expired": {
      await handleCheckoutExpired(event.data.object);
      break;
    }

    case "checkout.session.async_payment_failed": {
      await handleCheckoutExpired(event.data.object, "Payment failed");
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
};

async function handleCheckoutCompleted(session) {
  const order = await withTransaction(async (dbSession) => {
    const updatedOrder = await Order.findOneAndUpdate(
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
      withSession(dbSession, { returnDocument: "after" }),
    );

    if (!updatedOrder) return null;

    if (updatedOrder.couponId) {
      const conversion = await Coupon.updateOne(
        {
          _id: updatedOrder.couponId,
          reservedCount: { $gt: 0 },
        },
        { $inc: { reservedCount: -1, redeemedCount: 1 } },
        withSession(dbSession),
      );

      if (conversion.matchedCount !== 1) {
        const coupon = await Coupon.findById(updatedOrder.couponId)
          .select("_id")
          .session(dbSession);
        if (coupon) {
          await Coupon.updateOne(
            { _id: coupon._id },
            { $inc: { redeemedCount: 1 } },
            withSession(dbSession),
          );
        }
        logger.warn("Coupon reservation missing when payment completed", {
          orderId: updatedOrder._id.toString(),
          couponId: updatedOrder.couponId.toString(),
        });
      }
    } else if (updatedOrder.couponCode) {
      await Coupon.updateOne(
        { code: updatedOrder.couponCode },
        { $inc: { redeemedCount: 1 } },
        withSession(dbSession),
      );
    }

    return updatedOrder;
  });

  if (!order) {
    const knownOrder = await Order.findOne({ stripeSessionId: session.id })
      .select("_id status")
      .lean();
    if (knownOrder) {
      logger.info("Webhook order already transitioned", {
        orderId: knownOrder._id.toString(),
        status: knownOrder.status,
      });
    } else {
      logger.error("Webhook order missing for session", {
        sessionId: session.id,
      });
    }
    return;
  }

  await Cart.findOneAndUpdate(
    { user: order.user },
    { $set: { items: [] } },
  );

  const customer = await User.findById(order.user).select("email name").lean();
  if (customer?.email) {
    await sendMail({
      to: customer.email,
      subject: `Order ${order._id} confirmed`,
      text: `Thanks${customer.name ? ` ${customer.name}` : ""}. We received payment for order ${order._id}. Total ${order.total}.`,
    }).catch((error) => {
      logger.error("Order confirmation email failed", {
        error: error.message,
        orderId: order._id.toString(),
      });
    });
  }

  logger.info("Order marked paid", { orderId: order._id.toString() });
}

async function handleCheckoutExpired(
  session,
  reason = "Stripe checkout session expired",
) {
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

    logger.info("Checkout cancelled and stock released", {
      orderId: order._id.toString(),
      reason,
    });
  } catch (error) {
    logger.error("Failed to cancel expired checkout", {
      orderId: order._id.toString(),
      error: error.message,
    });
  }
}
