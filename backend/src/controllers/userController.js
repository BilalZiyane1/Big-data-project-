const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { logBusinessEvent } = require("../logging/auditLogger");

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.json({
    success: true,
    data: user,
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, addresses } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError("Email already in use", 409);
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (Array.isArray(addresses)) user.addresses = addresses;

  await user.save();

  logBusinessEvent({
    req,
    event: "user.profile.updated",
    entity: "user",
    action: "update_profile",
    details: {
      userId: user._id,
      changedName: Boolean(name),
      changedEmail: Boolean(email),
      addressesCount: Array.isArray(user.addresses) ? user.addresses.length : 0,
    },
  });

  res.json({
    success: true,
    message: "Profile updated",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      addresses: user.addresses,
    },
  });
});

const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "wishlist",
    select: "name price images category averageRating stockQuantity",
  });

  res.json({
    success: true,
    data: user.wishlist,
  });
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const user = await User.findById(req.user._id);
  const alreadyExists = user.wishlist.some((id) => id.toString() === productId);

  if (!alreadyExists) {
    user.wishlist.push(productId);
    await user.save();
  }

  logBusinessEvent({
    req,
    event: alreadyExists ? "wishlist.item.duplicate" : "wishlist.item.added",
    entity: "wishlist",
    action: alreadyExists ? "duplicate_add" : "add_item",
    details: {
      productId,
      productName: product.name,
      alreadyExists,
    },
  });

  res.json({
    success: true,
    message: alreadyExists ? "Already in wishlist" : "Added to wishlist",
  });
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError("Invalid product id", 400);
  }

  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
  await user.save();

  logBusinessEvent({
    req,
    event: "wishlist.item.removed",
    entity: "wishlist",
    action: "remove_item",
    details: {
      productId,
      totalItems: user.wishlist.length,
    },
  });

  res.json({
    success: true,
    message: "Removed from wishlist",
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
