const { toMoney } = require("./money");

const normalizeCouponCode = (code) =>
  String(code || "")
    .trim()
    .toUpperCase();

const assertCouponIsRedeemable = (coupon, subtotal, now = new Date()) => {
  if (!coupon || coupon.isActive === false) {
    const error = new Error("This coupon is not available");
    error.status = 400;
    error.code = "COUPON_INVALID";
    throw error;
  }

  if (coupon.startsAt && now < coupon.startsAt) {
    const error = new Error("This coupon is not active yet");
    error.status = 400;
    error.code = "COUPON_NOT_STARTED";
    throw error;
  }

  if (coupon.endsAt && now > coupon.endsAt) {
    const error = new Error("This coupon has expired");
    error.status = 400;
    error.code = "COUPON_EXPIRED";
    throw error;
  }

  if (
    Number.isFinite(coupon.maxRedemptions) &&
    coupon.maxRedemptions >= 0 &&
    Number(coupon.redeemedCount || 0) + Number(coupon.reservedCount || 0) >=
      coupon.maxRedemptions
  ) {
    const error = new Error("This coupon has reached its redemption limit");
    error.status = 400;
    error.code = "COUPON_EXHAUSTED";
    throw error;
  }

  if (toMoney(subtotal) < toMoney(coupon.minSubtotal || 0)) {
    const error = new Error(
      `This coupon requires a subtotal of at least ${toMoney(coupon.minSubtotal)}`,
    );
    error.status = 400;
    error.code = "COUPON_MIN_SUBTOTAL";
    throw error;
  }
};

const calculateDiscount = (coupon, subtotal) => {
  const safeSubtotal = toMoney(subtotal);
  if (!coupon || safeSubtotal <= 0) return 0;

  let discount =
    coupon.type === "percent"
      ? toMoney(safeSubtotal * (Number(coupon.value) / 100))
      : toMoney(coupon.value);

  if (Number.isFinite(coupon.maxDiscount) && coupon.maxDiscount >= 0) {
    discount = Math.min(discount, toMoney(coupon.maxDiscount));
  }

  return Math.min(discount, safeSubtotal);
};

module.exports = {
  normalizeCouponCode,
  assertCouponIsRedeemable,
  calculateDiscount,
};
