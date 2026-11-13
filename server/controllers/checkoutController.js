const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Product = require("../models/Product");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const { statusEvent } = require("../lib/orderLifecycle");
const { withTransaction, withSession } = require("../lib/transactionHelper");
const { priceCheckout } = require("../lib/checkoutPricing");
const logger = require("../lib/logger");

const CHECKOUT_KEY_PATTERN = /^[A-Za-z0-9._-]{16,128}$/;

const getReservationWindowMs = () => {
  const minutes = Number(process.env.CHECKOUT_RESERVATION_MINUTES ?? 30);
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 24 * 60) {
    throw new Error(
      "CHECKOUT_RESERVATION_MINUTES must be an integer between 30 and 1440",
    );
  }
  return minutes * 60 * 1000;
};

const getCheckoutKey = (req) => {
  const key = req.get("Idempotency-Key");
  if (!key) return undefined;
  if (!CHECKOUT_KEY_PATTERN.test(key)) {
    const error = new Error(
      "Idempotency-Key must be 16–128 letters, numbers, dots, underscores, or dashes",
    );
    error.status = 400;
    throw error;
  }
  return key;
};

const createInsufficientStockError = (product, item) => {
  const error = new Error(
    `Insufficient stock for "${product?.name || item.id}". Requested ${item.quantity}, available ${product?.stock ?? 0}.`,
  );
  error.status = 409;
  error.code = "INSUFFICIENT_STOCK";
  return error;
};

async function getExistingCheckout(userId, checkoutKey) {
  if (!checkoutKey) return null;

  return Order.findOne({ user: userId, checkoutKey })
    .select("status checkoutUrl reservationExpiresAt")
    .lean();
}

const toQuote = (priced) => ({
  couponCode: priced.couponCode,
  subtotal: priced.subtotal,
  discount: priced.discount,
  shippingCost: priced.shippingCost,
  tax: priced.tax,
  total: priced.total,
});

const createCouponUnavailableError = () => {
  const error = new Error("This coupon is no longer available");
  error.status = 409;
  error.code = "COUPON_UNAVAILABLE";
  return error;
};

const reserveCouponRedemption = async (coupon, subtotal, now, session) => {
  const reserved = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      isActive: { $ne: false },
      $expr: {
        $and: [
          {
            $lte: [
              { $ifNull: ["$minSubtotal", 0] },
              subtotal,
            ],
          },
          {
            $or: [
              { $eq: [{ $ifNull: ["$startsAt", null] }, null] },
              { $lte: ["$startsAt", now] },
            ],
          },
          {
            $or: [
              { $eq: [{ $ifNull: ["$endsAt", null] }, null] },
              { $gte: ["$endsAt", now] },
            ],
          },
          {
            $or: [
              { $eq: [{ $ifNull: ["$maxRedemptions", null] }, null] },
              {
                $lt: [
                  {
                    $add: [
                      { $ifNull: ["$redeemedCount", 0] },
                      { $ifNull: ["$reservedCount", 0] },
                    ],
                  },
                  "$maxRedemptions",
                ],
              },
            ],
          },
        ],
      },
    },
    { $inc: { reservedCount: 1 } },
    withSession(session),
  );

  if (!reserved) throw createCouponUnavailableError();
};

exports.quoteCheckout = async (req, res) => {
  const priced = await priceCheckout({
    items: req.body.items,
    location: req.body.location,
    couponCode: req.body.couponCode,
  });
  res.json(toQuote(priced));
};

exports.createCheckoutSession = async (req, res) => {
  const { items, location: locationInput, address, couponCode } = req.body;
  const checkoutKey = getCheckoutKey(req);
  const now = new Date();

  const existing = await getExistingCheckout(req.user._id, checkoutKey);
  if (existing) {
    if (
      existing.status === "pending" &&
      existing.reservationExpiresAt > now &&
      existing.checkoutUrl
    ) {
      return res.json({ url: existing.checkoutUrl, reused: true });
    }

    return res.status(409).json({
      message:
        "This checkout request has already finished. Start a new checkout to continue.",
    });
  }

  const priced = await priceCheckout({
    items,
    location: locationInput,
    couponCode,
    now,
  });

  const {
    orderItemsRequest,
    orderItems,
    storeItems,
    deliveryLocation,
    coupon,
    subtotal,
    discount,
    shippingCost,
    tax,
    total,
  } = priced;

  const reservationExpiresAt = new Date(now.getTime() + getReservationWindowMs());
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  const orderId = new mongoose.Types.ObjectId();

  const lineItems = orderItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        images: item.image ? [item.image] : [],
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `Shipping to ${deliveryLocation.name}` },
        unit_amount: Math.round(shippingCost * 100),
      },
      quantity: 1,
    });
  }

  if (tax > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Sales tax" },
        unit_amount: Math.round(tax * 100),
      },
      quantity: 1,
    });
  }

  const sessionPayload = {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: req.user.email,
    success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/cart`,
    expires_at: Math.floor(reservationExpiresAt.getTime() / 1000),
    client_reference_id: orderId.toString(),
    metadata: {
      orderId: orderId.toString(),
      deliveryCity: address?.cityArea || deliveryLocation.name,
      deliveryGovernorate: address?.governorate || deliveryLocation.governorate,
      couponCode: priced.couponCode || "",
    },
  };

  if (discount > 0) {
    const stripeCoupon = await stripe.coupons.create({
      amount_off: Math.round(discount * 100),
      currency: "usd",
      duration: "once",
      name: priced.couponCode || "Discount",
    });
    sessionPayload.discounts = [{ coupon: stripeCoupon.id }];
  }

  const stripeSession = await stripe.checkout.sessions.create(
    sessionPayload,
    checkoutKey
      ? { idempotencyKey: `checkout_${req.user._id.toString()}_${checkoutKey}` }
      : undefined,
  );

  try {
    await withTransaction(async (session) => {
      const reservedItems = [];

      try {
        for (const item of orderItemsRequest) {
          const updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.id,
              isActive: { $ne: false },
              stock: { $gte: item.quantity },
            },
            { $inc: { stock: -item.quantity } },
            withSession(session, { returnDocument: "after" }),
          );

          if (!updatedProduct) {
            const product = storeItems.find(
              (candidate) => candidate._id.toString() === item.id,
            );
            throw createInsufficientStockError(product, item);
          }
          reservedItems.push(item);
        }

        if (coupon) {
          await reserveCouponRedemption(coupon, subtotal, now, session);
        }

        await Order.create(
          [
            {
              _id: orderId,
              user: req.user._id,
              checkoutKey,
              checkoutUrl: stripeSession.url,
              stripeSessionId: stripeSession.id,
              items: orderItems,
              shippingAddress: address || undefined,
              shippingCost,
              tax,
              subtotal,
              discount,
              couponCode: priced.couponCode,
              couponId: coupon?._id,
              total,
              status: "pending",
              reservationExpiresAt,
              statusHistory: [
                statusEvent("pending", "customer", "Checkout session created"),
              ],
            },
          ],
          withSession(session),
        );
      } catch (error) {
        if (!session && reservedItems.length > 0) {
          await Promise.all(
            reservedItems.map((item) =>
              Product.updateOne(
                { _id: item.id },
                { $inc: { stock: item.quantity } },
              ),
            ),
          );
        }
        throw error;
      }
    });
  } catch (error) {
    if (typeof stripe.checkout.sessions.expire === "function") {
      await stripe.checkout.sessions.expire(stripeSession.id).catch(() => {});
    }

    if (error.code === 11000 && checkoutKey) {
      const concurrentCheckout = await getExistingCheckout(
        req.user._id,
        checkoutKey,
      );
      if (concurrentCheckout?.checkoutUrl) {
        return res.json({ url: concurrentCheckout.checkoutUrl, reused: true });
      }
    }

    if (error.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({ message: error.message });
    }

    throw error;
  }

  logger.info("Checkout session created", {
    orderId: orderId.toString(),
    userId: req.user._id.toString(),
    coupon: coupon?.code,
    total,
  });

  res.json({
    url: stripeSession.url,
    orderId: orderId.toString(),
    totals: toQuote(priced),
  });
};
