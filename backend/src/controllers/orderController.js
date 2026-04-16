const Stripe = require("stripe");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { buildPagination, buildPaginationMeta } = require("../utils/pagination");
const { logBusinessEvent } = require("../logging/auditLogger");

const calcTotals = (subtotal) => {
  const shippingFee = subtotal >= 120 ? 0 : 12;
  const tax = Number((subtotal * 0.1).toFixed(2));
  const total = Number((subtotal + shippingFee + tax).toFixed(2));

  return { shippingFee, tax, total };
};

const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod = process.env.PAYMENT_MODE || "mock" } = req.body;

  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "stockQuantity"
  );

  if (!cart || !cart.items.length) {
    throw new AppError("Cart is empty", 400);
  }

  for (const item of cart.items) {
    if (!item.product) {
      throw new AppError("A product in cart no longer exists", 400);
    }

    if (item.quantity > item.product.stockQuantity) {
      throw new AppError(`Not enough stock for ${item.nameSnapshot}`, 400);
    }
  }

  const subtotal = Number(cart.subtotal.toFixed(2));
  const { shippingFee, tax, total } = calcTotals(subtotal);

  const payment = {
    method: paymentMethod,
    status: "pending",
    amount: total,
    currency: "usd",
  };

  let paymentClientSecret = null;

  if (paymentMethod === "stripe" && process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { userId: req.user._id.toString() },
    });

    payment.transactionId = intent.id;
    paymentClientSecret = intent.client_secret;
  } else {
    payment.method = "mock";
    payment.status = "paid";
    payment.paidAt = new Date();
    payment.transactionId = `mock_${Date.now()}`;
  }

  const order = await Order.create({
    user: req.user._id,
    items: cart.items.map((item) => ({
      product: item.product._id,
      name: item.nameSnapshot,
      image: item.imageSnapshot,
      price: item.priceSnapshot,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    })),
    shippingAddress,
    payment,
    subtotal,
    shippingFee,
    tax,
    total,
    status: payment.status === "paid" ? "paid" : "pending",
  });

  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  cart.items = [];
  cart.recalculate();
  await cart.save();

  logBusinessEvent({
    req,
    event: "order.created",
    entity: "order",
    action: "create",
    details: {
      orderId: order._id,
      total,
      paymentMethod: payment.method,
      paymentStatus: payment.status,
      itemsCount: order.items.length,
    },
  });

  res.status(201).json({
    success: true,
    message: "Order created",
    data: order,
    paymentClientSecret,
  });
});

const createPaymentIntent = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!amount || Number(amount) <= 0) {
    throw new AppError("Amount must be positive", 400);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    logBusinessEvent({
      req,
      event: "payment.intent.created",
      entity: "payment",
      action: "create_intent",
      details: {
        amount: Number(amount),
        provider: "mock",
      },
    });

    return res.json({
      success: true,
      message: "Mock payment intent created",
      data: {
        clientSecret: `mock_intent_${Date.now()}`,
      },
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(Number(amount) * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { userId: req.user._id.toString() },
  });

  res.json({
    success: true,
    data: {
      clientSecret: intent.client_secret,
      id: intent.id,
    },
  });

  logBusinessEvent({
    req,
    event: "payment.intent.created",
    entity: "payment",
    action: "create_intent",
    details: {
      amount: Number(amount),
      provider: "stripe",
      intentId: intent.id,
    },
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query);

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ user: req.user._id }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: buildPaginationMeta({ total, page, limit }),
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("items.product", "name images");

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    throw new AppError("Forbidden", 403);
  }

  res.json({
    success: true,
    data: order,
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = buildPagination(req.query);

  const filter = {};
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: buildPaginationMeta({ total, page, limit }),
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  order.status = status;

  if (status === "delivered") {
    order.deliveredAt = new Date();
  }

  if (status === "paid" && order.payment.status !== "paid") {
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
  }

  await order.save();

  logBusinessEvent({
    req,
    event: "order.status.updated",
    entity: "order",
    action: "update_status",
    details: {
      orderId: order._id,
      status,
      paymentStatus: order.payment.status,
    },
  });

  res.json({
    success: true,
    message: "Order status updated",
    data: order,
  });
});

module.exports = {
  createOrder,
  createPaymentIntent,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
