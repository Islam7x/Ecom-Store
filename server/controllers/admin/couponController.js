const Coupon = require("../../models/Coupon");
const { normalizeCouponCode } = require("../../lib/couponEngine");

exports.listCoupons = async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ coupons });
};

exports.createCoupon = async (req, res) => {
  const payload = {
    ...req.body,
    code: normalizeCouponCode(req.body.code),
  };
  const coupon = await Coupon.create(payload);
  res.status(201).json(coupon);
};

exports.updateCoupon = async (req, res) => {
  const updates = { ...req.body };
  if (updates.code) updates.code = normalizeCouponCode(updates.code);

  const filter = { _id: req.params.id };
  if (updates.maxRedemptions !== undefined) {
    filter.$expr = {
      $lte: [
        {
          $add: [
            { $ifNull: ["$redeemedCount", 0] },
            { $ifNull: ["$reservedCount", 0] },
          ],
        },
        updates.maxRedemptions,
      ],
    };
  }

  const coupon = await Coupon.findOneAndUpdate(
    filter,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  );

  if (!coupon) {
    if (updates.maxRedemptions !== undefined) {
      const exists = await Coupon.exists({ _id: req.params.id });
      if (exists) {
        return res.status(409).json({
          message:
            "Maximum redemptions cannot be lower than redeemed and reserved uses.",
        });
      }
    }
    return res.status(404).json({ message: "Coupon not found" });
  }

  res.json(coupon);
};

exports.deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { returnDocument: "after" },
  );

  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found" });
  }

  res.json({ message: "Coupon archived", coupon });
};
