// server/routes/admin/orders.js
const express = require("express");
const Joi = require("joi");
const validate = require("../../middleware/validate");
const { protect } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/admin");
const ctrl = require("../../controllers/admin/orderController");

const router = express.Router();

const statusSchema = Joi.object({
  status: Joi.string()
    .valid("pending", "paid", "shipped", "delivered", "cancelled")
    .required(),
});

const addressSchema = Joi.object({
  fullName: Joi.string().trim().required(),
  mobile: Joi.string().trim().required(),
  street: Joi.string().trim().required(),
  building: Joi.string().allow("").optional(),
  cityArea: Joi.string().trim().required(),
  district: Joi.string().allow("").optional(),
  governorate: Joi.string().trim().required(),
  landmark: Joi.string().allow("").optional(),
  addressType: Joi.string().valid("home", "office").optional(),
});

// GET all orders with pagination and filters
router.get("/", protect, requireAdmin, ctrl.getAllOrders);

// GET order statistics
router.get("/stats/summary", protect, requireAdmin, ctrl.getOrderStats);

// GET specific order
router.get("/:id", protect, requireAdmin, ctrl.getOrderById);

// PUT update order status
router.put(
  "/:id/status",
  protect,
  requireAdmin,
  validate(statusSchema),
  ctrl.updateOrderStatus,
);

// PUT update shipping address
router.put(
  "/:id/shipping-address",
  protect,
  requireAdmin,
  validate(addressSchema),
  ctrl.updateShippingAddress,
);

// DELETE cancel order
router.delete("/:id", protect, requireAdmin, ctrl.cancelOrder);

module.exports = router;
