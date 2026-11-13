const express = require("express");
const Joi = require("joi");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/cartController");

const router = express.Router();

const itemSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).max(100).required(),
});

const itemsSchema = Joi.object({
  items: Joi.array().items(itemSchema).max(50).required(),
});

router.get("/", protect, asyncHandler(ctrl.getCart));
router.put("/", protect, validate(itemsSchema), asyncHandler(ctrl.replaceCart));
router.post(
  "/merge",
  protect,
  validate(itemsSchema),
  asyncHandler(ctrl.mergeCart),
);
router.delete("/", protect, asyncHandler(ctrl.clearCart));

module.exports = router;
