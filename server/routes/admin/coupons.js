const express = require("express");
const Joi = require("joi");
const validate = require("../../middleware/validate");
const asyncHandler = require("../../middleware/asyncHandler");
const { protect } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/admin");
const ctrl = require("../../controllers/admin/couponController");

const router = express.Router();

const couponSchema = Joi.object({
  code: Joi.string().trim().min(3).max(40).required(),
  description: Joi.string().trim().max(200).allow("").optional(),
  type: Joi.string().valid("percent", "fixed").required(),
  value: Joi.number().min(0).required(),
  minSubtotal: Joi.number().min(0).optional(),
  maxDiscount: Joi.number().min(0).optional(),
  maxRedemptions: Joi.number().integer().min(0).optional(),
  startsAt: Joi.date().optional(),
  endsAt: Joi.date().optional(),
  isActive: Joi.boolean().optional(),
});

const updateSchema = couponSchema.fork(
  ["code", "type", "value"],
  (schema) => schema.optional(),
).min(1);

router.use(protect, requireAdmin);
router.get("/", asyncHandler(ctrl.listCoupons));
router.post("/", validate(couponSchema), asyncHandler(ctrl.createCoupon));
router.put("/:id", validate(updateSchema), asyncHandler(ctrl.updateCoupon));
router.delete("/:id", asyncHandler(ctrl.deleteCoupon));

module.exports = router;
