const Cart = require("../models/Cart");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { logBusinessEvent } = require("../logging/auditLogger");

const getPrimaryImage = (product) => {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : undefined;

  if (typeof firstImage === "string" && firstImage.trim()) {
    return firstImage.trim();
  }

  if (firstImage && typeof firstImage.url === "string" && firstImage.url.trim()) {
    return firstImage.url.trim();
  }

  return "";
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

const buildVariantMatcher = (item, productId, size, color) => {
  const sameProduct = item.product.toString() === productId;
  const sameSize = typeof size === "undefined" ? true : item.size === size;
  const sameColor = typeof color === "undefined" ? true : item.color === color;

  return sameProduct && sameSize && sameColor;
};

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  await cart.populate("items.product", "name price stockQuantity images");

  res.json({
    success: true,
    data: cart,
  });
});

const addCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity, size, color } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.stockQuantity < quantity) {
    throw new AppError("Requested quantity exceeds stock", 400);
  }

  const cart = await getOrCreateCart(req.user._id);

  const existingIndex = cart.items.findIndex((item) =>
    buildVariantMatcher(item, productId, size, color)
  );

  if (existingIndex >= 0) {
    const nextQty = cart.items[existingIndex].quantity + quantity;

    if (nextQty > product.stockQuantity) {
      throw new AppError("Requested quantity exceeds stock", 400);
    }

    cart.items[existingIndex].quantity = nextQty;
  } else {
    cart.items.push({
      product: product._id,
      nameSnapshot: product.name,
      imageSnapshot: getPrimaryImage(product),
      priceSnapshot: product.price,
      quantity,
      size,
      color,
    });
  }

  cart.recalculate();
  await cart.save();

  logBusinessEvent({
    req,
    event: "cart.item.added",
    entity: "cart",
    action: "add_item",
    details: {
      productId,
      quantity,
      size,
      color,
      subtotal: cart.subtotal,
      itemCount: cart.itemCount,
    },
  });

  res.status(201).json({
    success: true,
    message: "Item added to cart",
    data: cart,
  });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity, size, color } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (quantity > product.stockQuantity) {
    throw new AppError("Requested quantity exceeds stock", 400);
  }

  const cart = await getOrCreateCart(req.user._id);

  const itemIndex = cart.items.findIndex((item) =>
    buildVariantMatcher(item, productId, size, color)
  );

  if (itemIndex < 0) {
    throw new AppError("Cart item not found", 404);
  }

  cart.items[itemIndex].quantity = quantity;
  cart.recalculate();
  await cart.save();

  logBusinessEvent({
    req,
    event: "cart.item.updated",
    entity: "cart",
    action: "update_item",
    details: {
      productId,
      quantity,
      size,
      color,
      subtotal: cart.subtotal,
      itemCount: cart.itemCount,
    },
  });

  res.json({
    success: true,
    message: "Cart updated",
    data: cart,
  });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { size, color } = req.query;

  const cart = await getOrCreateCart(req.user._id);

  const beforeCount = cart.items.length;
  cart.items = cart.items.filter(
    (item) => !buildVariantMatcher(item, productId, size, color)
  );

  if (beforeCount === cart.items.length) {
    throw new AppError("Cart item not found", 404);
  }

  cart.recalculate();
  await cart.save();

  logBusinessEvent({
    req,
    event: "cart.item.removed",
    entity: "cart",
    action: "remove_item",
    details: {
      productId,
      size,
      color,
      subtotal: cart.subtotal,
      itemCount: cart.itemCount,
    },
  });

  res.json({
    success: true,
    message: "Item removed from cart",
    data: cart,
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  cart.recalculate();
  await cart.save();

  logBusinessEvent({
    req,
    event: "cart.cleared",
    entity: "cart",
    action: "clear",
    details: {
      subtotal: cart.subtotal,
      itemCount: cart.itemCount,
    },
  });

  res.json({
    success: true,
    message: "Cart cleared",
    data: cart,
  });
});

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
