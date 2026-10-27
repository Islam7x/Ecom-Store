const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: String,
  },
  { _id: false },
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    street: { type: String, required: true },
    building: String,
    cityArea: { type: String, required: true },
    district: String,
    governorate: { type: String, required: true },
    landmark: String,
    addressType: { type: String, enum: ["home", "office"] },
  },
  { _id: false },
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      required: true,
    },
    actor: { type: String, enum: ["customer", "payment", "admin", "system"], required: true },
    note: { type: String, maxlength: 500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stripeSessionId: { type: String, unique: true, sparse: true },
    checkoutKey: { type: String, maxlength: 160 },
    checkoutUrl: String,
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: ShippingAddressSchema,
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paidAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    reservationExpiresAt: Date,
    statusHistory: { type: [StatusHistorySchema], default: () => [] },
  },
  { timestamps: true },
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ user: 1, checkoutKey: 1 }, { unique: true, sparse: true });
OrderSchema.index({ status: 1, reservationExpiresAt: 1 });
// Note: stripeSessionId index is already created by unique: true constraint

module.exports = mongoose.model("Order", OrderSchema);
