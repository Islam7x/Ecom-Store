// server/routes/checkout.js
const express = require("express");
const Joi = require("joi");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/checkoutController");

const router = express.Router();

const checkoutSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().hex().length(24).required(),
        quantity: Joi.number().integer().min(1).max(100).required(),
      })
    )
    .min(1)
    .max(50)
    .required(),
  location: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    governorate: Joi.string().required(),
  }).optional(),
  address: Joi.object({
    fullName: Joi.string().required(),
    mobile: Joi.string().required(),
    street: Joi.string().required(),
    building: Joi.string().allow("").optional(),
    cityArea: Joi.string().required(),
    district: Joi.string().allow("").optional(),
    governorate: Joi.string().required(),
    landmark: Joi.string().allow("").optional(),
    addressType: Joi.string().valid("home", "office").optional(),
  }).optional(),
});

router.post(
  "/session",
  protect,
  validate(checkoutSchema),
  asyncHandler(ctrl.createCheckoutSession),
);

module.exports = router;
