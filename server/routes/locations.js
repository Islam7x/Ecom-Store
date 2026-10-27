// server/routes/locations.js
const express = require("express");
const { cacheMiddleware } = require("../middleware/cache");
const ctrl = require("../controllers/locationController");

const router = express.Router();

router.get(
  "/",
  (req, res, next) => cacheMiddleware("locations:all", 3600)(req, res, next),
  ctrl.getLocations,
);

module.exports = router;
