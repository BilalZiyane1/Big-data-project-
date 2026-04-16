const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    nameSnapshot: { type: String, required: true },
    imageSnapshot: { type: String },
    priceSnapshot: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    size: { type: String, enum: ["XS", "S", "M", "L", "XL", "XXL"] },
    color: { type: String },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: [cartItemSchema],
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

cartSchema.methods.recalculate = function recalculate() {
  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity,
    0
  );
  this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
};

module.exports = mongoose.model("Cart", cartSchema);
