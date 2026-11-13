const express = require("express");
const Joi = require("joi");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const ctrl = require("../controllers/couponController");

const router = express.Router();

const previewSchema = Joi.object({
  couponCode: Joi.string().trim().min(3).max(40).required(),
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).max(100).required(),
      }),
    )
    .min(1)
    .max(50)
    .required(),
  location: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    governorate: Joi.string().required(),
  }).optional(),
});

router.get("/", asyncHandler(ctrl.listPublicCoupons));
router.get("/:code", asyncHandler(ctrl.getCouponByCode));
router.post(
  "/preview",
  validate(previewSchema),
  asyncHandler(ctrl.previewCoupon),
);

module.exports = router;
