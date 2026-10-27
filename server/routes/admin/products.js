// server/routes/admin/products.js
const express = require("express");
const Joi = require("joi");
const validate = require("../../middleware/validate");
const { protect } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/admin");
const ctrl = require("../../controllers/admin/productController");

const router = express.Router();

const productSchema = Joi.object({
  name: Joi.string().trim().required(),
  price: Joi.number().positive().required(),
  description: Joi.string().allow("").optional(),
  image: Joi.string().uri().allow("").optional(),
  category: Joi.string().trim().optional(),
  stock: Joi.number().integer().min(0).default(1),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().optional(),
  price: Joi.number().positive().optional(),
  description: Joi.string().allow("").optional(),
  image: Joi.string().uri().allow("").optional(),
  category: Joi.string().trim().optional(),
  stock: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).min(1); // at least one field

const stockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required(),
});

const bulkUpdateSchema = Joi.object({
  productIds: Joi.array().items(Joi.string()).min(1).required(),
  updates: Joi.object({
    name: Joi.string().trim().optional(),
    price: Joi.number().positive().optional(),
    description: Joi.string().allow("").optional(),
    image: Joi.string().uri().allow("").optional(),
    category: Joi.string().trim().optional(),
    stock: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
});

// GET all products with pagination and filters
router.get("/", protect, requireAdmin, ctrl.getAllProducts);

// GET product categories
router.get("/categories/list", protect, requireAdmin, ctrl.getCategories);

// GET specific product
router.get("/:id", protect, requireAdmin, ctrl.getProductById);

// POST create new product
router.post(
  "/",
  protect,
  requireAdmin,
  validate(productSchema),
  ctrl.createProduct,
);

// PUT update product
router.put(
  "/:id",
  protect,
  requireAdmin,
  validate(updateSchema),
  ctrl.updateProduct,
);

// PUT update only stock
router.put(
  "/:id/stock",
  protect,
  requireAdmin,
  validate(stockSchema),
  ctrl.updateStock,
);

// DELETE product (soft delete)
router.delete("/:id", protect, requireAdmin, ctrl.deleteProduct);

// POST bulk update products
router.post(
  "/bulk/update",
  protect,
  requireAdmin,
  validate(bulkUpdateSchema),
  ctrl.bulkUpdateProducts,
);

module.exports = router;
