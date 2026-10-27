const Product = require("../models/Product");
const { safeSearchPattern } = require("../lib/query");

// GET /api/products
exports.getProducts = async (req, res) => {
  const { category, search, sort, limit, page, minPrice, maxPrice } = req.query;
  const filter = { stock: { $gt: 0 }, isActive: { $ne: false } };

  if (category) {
    filter.category = String(category).trim();
  }

  const searchPattern = safeSearchPattern(search);
  if (searchPattern) {
    filter.name = { $regex: searchPattern, $options: "i" };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const parsedMin = minPrice === undefined ? undefined : Number(minPrice);
    const parsedMax = maxPrice === undefined ? undefined : Number(maxPrice);
    if (
      (parsedMin !== undefined && (!Number.isFinite(parsedMin) || parsedMin < 0)) ||
      (parsedMax !== undefined && (!Number.isFinite(parsedMax) || parsedMax < 0)) ||
      (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax)
    ) {
      return res.status(400).json({ message: "Price filters must be valid non-negative ranges" });
    }

    filter.price = {};
    if (parsedMin !== undefined) filter.price.$gte = parsedMin;
    if (parsedMax !== undefined) filter.price.$lte = parsedMax;
  }

  const sortOptions = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name: { name: 1 },
    newest: { createdAt: -1 },
  };
  const sortOption = sortOptions[sort] || sortOptions.newest;

  // Keep the raw array response that the storefront already consumes unless
  // consumers opt into pagination.
  if (!page && !limit) {
    const products = await Product.find(filter).sort(sortOption).lean();
    return res.json(products);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * pageSize;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortOption).skip(skip).limit(pageSize).lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    products,
    page: pageNum,
    pages: Math.ceil(total / pageSize),
    total,
  });
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isActive: { $ne: false },
  }).lean();

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
};

// GET /api/products/categories
exports.getCategories = async (_req, res) => {
  const categories = await Product.distinct("category", {
    isActive: { $ne: false },
    stock: { $gt: 0 },
  });
  res.json(categories.filter(Boolean).sort((a, b) => a.localeCompare(b)));
};
