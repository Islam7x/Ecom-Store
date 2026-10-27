const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 5000 },
    image: { type: String, trim: true },
    category: { type: String, trim: true, maxlength: 100 },
    stock: { type: Number, default: 1, min: 0, validate: Number.isInteger },
    // Stock and availability are deliberately separate. An out-of-stock item
    // remains manageable by staff, while an archived item stays unavailable
    // even if an older reservation is later released.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ── Database Indexes for Performance ─────────
// Commonly searched fields
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: "text" }); // Text index for search
ProductSchema.index({ stock: 1 });
ProductSchema.index({ isActive: 1, stock: 1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes for common queries
ProductSchema.index({ stock: 1, category: 1 });
ProductSchema.index({ price: 1, stock: 1 });

module.exports = mongoose.model("Product", ProductSchema);
