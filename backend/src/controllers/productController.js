const Product     = require('../models/Product');
const Review      = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const AppError    = require('../utils/AppError');
const { buildPagination, buildPaginationMeta } = require('../utils/pagination');
const { logBusinessEvent, logEcommerceEvent } = require('../logging/auditLogger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const recalculateProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', averageRating: { $avg: '$rating' }, ratingsCount: { $sum: 1 } } },
  ]);

  await Product.findByIdAndUpdate(
    productId,
    stats
      ? { averageRating: Number(stats.averageRating.toFixed(1)), ratingsCount: stats.ratingsCount }
      : { averageRating: 0, ratingsCount: 0 }
  );
};

// ─── Controllers ──────────────────────────────────────────────────────────────

const getProducts = asyncHandler(async (req, res) => {
  const { category, size, minPrice, maxPrice, q, color, sort = 'latest' } = req.query;
  const { page, limit, skip } = buildPagination(req.query);

  const filter = {};
  if (category) filter.category = category;
  if (size)     filter.sizes    = size;
  if (color)    filter.colors   = color;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (q) filter.$text = { $search: q };

  const sortMap = {
    latest:   { createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc:{ price: -1 },
    rating:   { averageRating: -1, ratingsCount: -1 },
  };

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortMap[sort] || sortMap.latest).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: buildPaginationMeta({ total, page, limit }),
  });

  // Log after respond to avoid delaying the client
  logEcommerceEvent({
    req,
    event:  'catalog.search.executed',
    entity: 'product',
    action: 'search',
    details: {
      filters:  { category, size, minPrice, maxPrice, q, color, sort },
      returned: products.length,
      total,
      page,
      limit,
    },
  });
});

const getFeaturedProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find({ isFeatured: true }).sort({ createdAt: -1 }).limit(8).lean();
  res.json({ success: true, data: products });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('createdBy', 'name').lean();

  if (!product) throw new AppError('Product not found', 404);

  const reviews = await Review.find({ product: product._id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({ success: true, data: { ...product, reviews } });

  // Product view event — valuable for recommendation engines & analytics
  logEcommerceEvent({
    req,
    event:  'product.viewed',
    entity: 'product',
    action: 'view',
    details: {
      productId:   product._id,
      name:        product.name,
      category:    product.category,
      price:       product.price,
      stockStatus: product.stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
      stockQty:    product.stockQuantity,
      isFeatured:  product.isFeatured,
      averageRating: product.averageRating,
      ratingsCount:  product.ratingsCount,
    },
  });
});

/** Related products: same category, excluding the requested product, top-rated. */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit  = Math.min(Number(req.query.limit) || 4, 12);

  const base = await Product.findById(id).select('category').lean();
  if (!base) throw new AppError('Product not found', 404);

  const products = await Product.find({
    category: base.category,
    _id: { $ne: id },
  })
    .sort({ averageRating: -1, ratingsCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: products });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({ ...req.body, createdBy: req.user._id });

  logEcommerceEvent({
    req,
    event:  'product.created',
    entity: 'product',
    action: 'create',
    details: {
      productId:     product._id,
      name:          product.name,
      category:      product.category,
      price:         product.price,
      stockQuantity: product.stockQuantity,
    },
  });

  res.status(201).json({ success: true, message: 'Product created', data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  const before = {
    price:         product.price,
    stockQuantity: product.stockQuantity,
    isFeatured:    product.isFeatured,
  };

  Object.assign(product, req.body);
  await product.save();

  logEcommerceEvent({
    req,
    event:  'product.updated',
    entity: 'product',
    action: 'update',
    details: {
      productId: product._id,
      name:      product.name,
      category:  product.category,
      changes: {
        priceBefore:  before.price,
        priceAfter:   product.price,
        stockBefore:  before.stockQuantity,
        stockAfter:   product.stockQuantity,
        featuredChanged: before.isFeatured !== product.isFeatured,
      },
    },
  });

  res.json({ success: true, message: 'Product updated', data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  await Promise.all([
    Product.findByIdAndDelete(req.params.id),
    Review.deleteMany({ product: req.params.id }),
  ]);

  logEcommerceEvent({
    req,
    event:  'product.deleted',
    entity: 'product',
    action: 'delete',
    details: { productId: req.params.id, name: product.name, category: product.category },
  });

  res.json({ success: true, message: 'Product deleted' });
});

const addOrUpdateReview = asyncHandler(async (req, res) => {
  const { id: productId } = req.params;
  const { rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);

  const existing = await Review.findOne({ product: productId, user: req.user._id });

  if (existing) {
    const oldRating = existing.rating;
    existing.rating  = rating;
    existing.comment = comment;
    await existing.save();

    logBusinessEvent({
      req,
      event:  'review.updated',
      entity: 'review',
      action: 'update',
      details: {
        productId,
        productName: product.name,
        ratingBefore: oldRating,
        ratingAfter:  rating,
        hasComment:   Boolean(comment),
      },
    });
  } else {
    await Review.create({ product: productId, user: req.user._id, rating, comment });

    logBusinessEvent({
      req,
      event:  'review.created',
      entity: 'review',
      action: 'create',
      details: {
        productId,
        productName: product.name,
        rating,
        hasComment: Boolean(comment),
      },
    });
  }

  await recalculateProductRating(product._id);

  res.status(existing ? 200 : 201).json({
    success: true,
    message: existing ? 'Review updated' : 'Review added',
  });
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  getProductById,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addOrUpdateReview,
};
