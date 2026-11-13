const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
    },
    description: { type: String, trim: true, maxlength: 200 },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    maxRedemptions: { type: Number, min: 0 },
    redeemedCount: { type: Number, default: 0, min: 0 },
    reservedCount: { type: Number, default: 0, min: 0 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CouponSchema.index({ isActive: 1, endsAt: 1 });

module.exports = mongoose.model("Coupon", CouponSchema);
