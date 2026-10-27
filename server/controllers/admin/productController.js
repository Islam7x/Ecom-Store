const Product = require("../../models/Product");
const { invalidateCache } = require("../../middleware/cache");
const { safeSearchPattern } = require("../../lib/query");

const invalidateStorefrontCache = () => invalidateCache("products:*");

// GET /api/admin/products
exports.getAllProducts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const { search, category } = req.query;
  const filter = {};

  // Archived products are hidden by default but remain recoverable for staff.
  if (req.query.includeArchived !== "true") {
    filter.isActive = { $ne: false };
  }

  const searchPattern = safeSearchPattern(search);
  if (searchPattern) {
    filter.$or = [
      { name: { $regex: searchPattern, $options: "i" } },
      { description: { $regex: searchPattern, $options: "i" } },
    ];
  }

  if (category) filter.category = String(category).trim();

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name: { name: 1 },
    stock: { stock: 1 },
  };
  const sortBy = sortOptions[req.query.sortBy] || sortOptions.newest;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  res.json({ products, page, pages: Math.ceil(total / limit), total });
};

// GET /api/admin/products/:id
exports.getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};

// POST /api/admin/products
exports.createProduct = async (req, res) => {
  const product = await Product.create(req.body);
  await invalidateStorefrontCache();
  res.status(201).json(product);
};

// PUT /api/admin/products/:id
exports.updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { returnDocument: "after", runValidators: true },
  );

  if (!product) return res.status(404).json({ message: "Product not found" });
  await invalidateStorefrontCache();
  res.json(product);
};

// DELETE /api/admin/products/:id
// Archive without modifying inventory. This preserves bookkeeping for pending
// reservations and prevents an expired checkout from unintentionally reviving it.
exports.deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { returnDocument: "after", runValidators: true },
  );

  if (!product) return res.status(404).json({ message: "Product not found" });
  await invalidateStorefrontCache();
  res.json({ message: "Product archived from storefront", product });
};

// PUT /api/admin/products/:id/stock
exports.updateStock = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { stock: req.body.stock },
    { returnDocument: "after", runValidators: true },
  );

  if (!product) return res.status(404).json({ message: "Product not found" });
  await invalidateStorefrontCache();
  res.json({ message: "Stock updated", product });
};

// GET /api/admin/products/categories/list
exports.getCategories = async (_req, res) => {
  const categories = await Product.distinct("category");
  res.json({ categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)) });
};

// POST /api/admin/products/bulk-update
exports.bulkUpdateProducts = async (req, res) => {
  const { productIds, updates } = req.body;
  const result = await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: updates },
    { runValidators: true },
  );

  await invalidateStorefrontCache();
  res.json({
    message: `Updated ${result.modifiedCount} products`,
    modifiedCount: result.modifiedCount,
  });
};
