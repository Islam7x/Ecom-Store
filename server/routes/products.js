// server/routes/products.js
const express = require("express");
const ctrl = require("../controllers/productController");
const asyncHandler = require("../middleware/asyncHandler");
const { cacheMiddleware } = require("../middleware/cache");

const router = express.Router();

// Cache product list for 5 minutes (300 seconds)
// Cache key varies by query params, so we use middleware before the controller
router.get(
  "/",
  (req, res, next) => {
    const queryKey = JSON.stringify(req.query);
    const cacheKey = `products:list:${queryKey}`;
    cacheMiddleware(cacheKey, 300)(req, res, next);
  },
  asyncHandler(ctrl.getProducts),
);

// Cache categories for 1 hour (3600 seconds)
router.get(
  "/categories",
  (req, res, next) => cacheMiddleware("products:categories", 3600)(req, res, next),
  asyncHandler(ctrl.getCategories),
);

// Cache individual product for 10 minutes (600 seconds)
router.get(
  "/:id",
  (req, res, next) => {
    const cacheKey = `products:${req.params.id}`;
    cacheMiddleware(cacheKey, 600)(req, res, next);
  },
  asyncHandler(ctrl.getProductById),
);

module.exports = router;
