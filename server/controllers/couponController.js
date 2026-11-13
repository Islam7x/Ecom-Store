const Coupon = require("../models/Coupon");
const { priceCheckout } = require("../lib/checkoutPricing");
const { normalizeCouponCode } = require("../lib/couponEngine");

const toPublicCoupon = (coupon) => ({
  code: coupon.code,
  description: coupon.description,
  type: coupon.type,
  value: coupon.value,
  minSubtotal: coupon.minSubtotal,
  endsAt: coupon.endsAt,
});

exports.listPublicCoupons = async (_req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
    ],
  })
    .select("code description type value minSubtotal endsAt")
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  res.json({ coupons: coupons.map(toPublicCoupon) });
};

exports.previewCoupon = async (req, res) => {
  const priced = await priceCheckout({
    items: req.body.items,
    location: req.body.location,
    couponCode: req.body.couponCode,
  });

  res.json({
    couponCode: priced.couponCode,
    description: priced.coupon?.description,
    subtotal: priced.subtotal,
    discount: priced.discount,
    shippingCost: priced.shippingCost,
    tax: priced.tax,
    total: priced.total,
  });
};

exports.getCouponByCode = async (req, res) => {
  const coupon = await Coupon.findOne({
    code: normalizeCouponCode(req.params.code),
    isActive: true,
  }).lean();

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  res.json(toPublicCoupon(coupon));
};
