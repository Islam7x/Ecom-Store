const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const {
  DELIVERY_LOCATIONS,
  DEFAULT_LOCATION_ID,
  getShippingCost,
} = require("../data/locations");
const { toMoney, calculateTax } = require("./money");
const {
  normalizeCouponCode,
  assertCouponIsRedeemable,
  calculateDiscount,
} = require("./couponEngine");

const normalizeItems = (items) => {
  const combined = new Map();

  for (const item of items) {
    combined.set(item.id, (combined.get(item.id) || 0) + item.quantity);
  }

  return [...combined.entries()].map(([id, quantity]) => ({ id, quantity }));
};

const resolveDeliveryLocation = (locationInput) => {
  const deliveryLocation = locationInput
    ? DELIVERY_LOCATIONS.find((location) => location.id === locationInput.id)
    : DELIVERY_LOCATIONS.find((location) => location.id === DEFAULT_LOCATION_ID);

  if (!deliveryLocation) {
    const error = new Error("Selected delivery location is unavailable");
    error.status = 400;
    throw error;
  }

  return deliveryLocation;
};

const priceCheckout = async ({ items, location, couponCode, now = new Date() }) => {
  const orderItemsRequest = normalizeItems(items);
  const productIds = orderItemsRequest.map((item) => item.id);
  const storeItems = await Product.find({
    _id: { $in: productIds },
    isActive: { $ne: false },
  });

  if (storeItems.length !== productIds.length) {
    const found = new Set(storeItems.map((product) => product._id.toString()));
    const missing = productIds.filter((id) => !found.has(id));
    const error = new Error(
      `Product(s) not found or unavailable: ${missing.join(", ")}`,
    );
    error.status = 404;
    throw error;
  }

  const deliveryLocation = resolveDeliveryLocation(location);

  const orderItems = orderItemsRequest.map((item) => {
    const product = storeItems.find(
      (candidate) => candidate._id.toString() === item.id,
    );
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

  let coupon = null;
  let discount = 0;
  const code = normalizeCouponCode(couponCode);
  if (code) {
    coupon = await Coupon.findOne({ code });
    assertCouponIsRedeemable(coupon, subtotal, now);
    discount = calculateDiscount(coupon, subtotal);
  }

  const discountedSubtotal = toMoney(subtotal - discount);
  const shippingCost = toMoney(getShippingCost(deliveryLocation, subtotal));
  const tax = calculateTax(discountedSubtotal);
  const total = toMoney(discountedSubtotal + shippingCost + tax);

  return {
    orderItemsRequest,
    orderItems,
    storeItems,
    deliveryLocation,
    coupon,
    couponCode: coupon ? coupon.code : undefined,
    subtotal,
    discount,
    shippingCost,
    tax,
    total,
  };
};

module.exports = {
  normalizeItems,
  priceCheckout,
};
