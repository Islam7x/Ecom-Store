const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Product = require("../models/Product");
const Order = require("../models/Order");
const {
  DELIVERY_LOCATIONS,
  DEFAULT_LOCATION_ID,
  getShippingCost,
} = require("../data/locations");
const { toMoney, calculateTax } = require("../lib/money");
const { statusEvent } = require("../lib/orderLifecycle");
const { withTransaction, withSession } = require("../lib/transactionHelper");

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

const normalizeItems = (items) => {
  const combined = new Map();

  for (const item of items) {
    combined.set(item.id, (combined.get(item.id) || 0) + item.quantity);
  }

  return [...combined.entries()].map(([id, quantity]) => ({ id, quantity }));
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

// POST /api/checkout/session
// Creates the Stripe session from server-side prices, then atomically reserves
// inventory and records the matching pending order.
exports.createCheckoutSession = async (req, res) => {
  const { items, location: locationInput, address } = req.body;
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

  const orderItemsRequest = normalizeItems(items);
  const productIds = orderItemsRequest.map((item) => item.id);
  const storeItems = await Product.find({
    _id: { $in: productIds },
    isActive: { $ne: false },
  });

  if (storeItems.length !== productIds.length) {
    const found = new Set(storeItems.map((product) => product._id.toString()));
    const missing = productIds.filter((id) => !found.has(id));
    return res
      .status(404)
      .json({ message: `Product(s) not found or unavailable: ${missing.join(", ")}` });
  }

  const deliveryLocation = locationInput
    ? DELIVERY_LOCATIONS.find((location) => location.id === locationInput.id)
    : DELIVERY_LOCATIONS.find((location) => location.id === DEFAULT_LOCATION_ID);

  if (!deliveryLocation) {
    return res.status(400).json({ message: "Selected delivery location is unavailable" });
  }

  const orderItems = orderItemsRequest.map((item) => {
    const product = storeItems.find((candidate) => candidate._id.toString() === item.id);
    return {
      product: product._id,
      name: product.name,
      price: toMoney(product.price),
      quantity: item.quantity,
      image: product.image,
    };
  });

  const subtotal = toMoney(
    orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const shippingCost = toMoney(getShippingCost(deliveryLocation, subtotal));
  const tax = calculateTax(subtotal);
  const total = toMoney(subtotal + shippingCost + tax);
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

  // Creating the Stripe session first avoids a database record with no hosted
  // payment session. It is not returned until the inventory reservation commits.
  const stripeSession = await stripe.checkout.sessions.create(
    {
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
      },
    },
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
        // Standalone MongoDB cannot use multi-document transactions. In that
        // development fallback, compensate any stock writes made before the
        // order write failed (for example, an idempotency-key race).
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
    // A session never handed to the customer should not remain payable.
    if (typeof stripe.checkout.sessions.expire === "function") {
      await stripe.checkout.sessions.expire(stripeSession.id).catch(() => {});
    }

    if (error.code === 11000 && checkoutKey) {
      const concurrentCheckout = await getExistingCheckout(req.user._id, checkoutKey);
      if (concurrentCheckout?.checkoutUrl) {
        return res.json({ url: concurrentCheckout.checkoutUrl, reused: true });
      }
    }

    if (error.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({ message: error.message });
    }

    throw error;
  }

  res.json({
    url: stripeSession.url,
    orderId: orderId.toString(),
    totals: { subtotal, shippingCost, tax, total },
  });
};
