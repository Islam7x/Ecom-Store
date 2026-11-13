// server/routes/admin/users.js
const express = require("express");
const Joi = require("joi");
const validate = require("../../middleware/validate");
const { protect } = require("../../middleware/auth");
const requireAdmin = require("../../middleware/admin");
const ctrl = require("../../controllers/admin/userController");

const router = express.Router();

router.get("/", protect, requireAdmin, ctrl.getAllUsers);

router.get(
  "/reports/customer-segments",
  protect,
  requireAdmin,
  ctrl.getCustomerSegments,
);

router.get("/:id", protect, requireAdmin, ctrl.getUserDetails);

// PUT /api/admin/users/:id/role - Update user's admin role
const roleSchema = Joi.object({
  isAdmin: Joi.boolean().required(),
});
router.put(
  "/:id/role",
  protect,
  requireAdmin,
  validate(roleSchema),
  ctrl.updateUserRole,
);

// DELETE /api/admin/users/:id - Delete a user
router.delete("/:id", protect, requireAdmin, ctrl.deleteUser);

module.exports = router;
