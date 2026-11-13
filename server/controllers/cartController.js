const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const MAX_QTY = 100;

const toObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid product id");
    error.status = 400;
    throw error;
  }
  return new mongoose.Types.ObjectId(id);
};

const normalizeLines = (items = []) => {
  const combined = new Map();
  for (const item of items) {
    const id = String(item.id || item.product || "");
    const quantity = Math.max(1, Math.min(MAX_QTY, Number(item.quantity) || 1));
    const objectId = toObjectId(id);
    const key = objectId.toString();
    combined.set(key, (combined.get(key) || 0) + quantity);
  }

  return [...combined.entries()].map(([id, quantity]) => ({
    product: new mongoose.Types.ObjectId(id),
    quantity: Math.min(quantity, MAX_QTY),
  }));
};

const presentCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) return { items: [] };

  const items = [];
  for (const line of cart.items) {
    const product = line.product;
    if (!product || product.isActive === false) continue;
    const stock = Number.isFinite(product.stock) ? product.stock : 0;
    if (stock <= 0) continue;

    items.push({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      stock,
      quantity: Math.min(line.quantity, stock, MAX_QTY),
    });
  }

  return { items };
};

exports.getCart = async (req, res) => {
  res.json(await presentCart(req.user._id));
};

exports.replaceCart = async (req, res) => {
  const items = normalizeLines(req.body.items);
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items } },
    { upsert: true },
  );
  res.json(await presentCart(req.user._id));
};

exports.mergeCart = async (req, res) => {
  const incoming = normalizeLines(req.body.items);
  const existing = await Cart.findOne({ user: req.user._id });
  const merged = new Map(
    (existing?.items || []).map((line) => [
      line.product.toString(),
      line.quantity,
    ]),
  );

  for (const line of incoming) {
    const key = line.product.toString();
    merged.set(key, Math.min(MAX_QTY, (merged.get(key) || 0) + line.quantity));
  }

  const productIds = [...merged.keys()];
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: { $ne: false },
  }).select("_id stock");
  const stockById = new Map(
    products.map((product) => [product._id.toString(), product.stock]),
  );

  const items = productIds
    .filter((id) => stockById.has(id))
    .map((id) => ({
      product: new mongoose.Types.ObjectId(id),
      quantity: Math.min(merged.get(id), stockById.get(id) || 0, MAX_QTY),
    }))
    .filter((line) => line.quantity > 0);

  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items } },
    { upsert: true },
  );

  res.json(await presentCart(req.user._id));
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items: [] } },
    { upsert: true },
  );
  res.json({ items: [] });
};
