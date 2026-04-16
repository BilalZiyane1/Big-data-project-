const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { buildPagination, buildPaginationMeta } = require("../utils/pagination");
const { logBusinessEvent } = require("../logging/auditLogger");

const getDashboardStats = asyncHandler(async (_req, res) => {
  const [usersCount, ordersCount, productsCount, salesAgg, monthlySales] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Product.countDocuments(),
    Order.aggregate([
      { $match: { status: { $in: ["paid", "shipped", "delivered"] } } },
      { $group: { _id: null, totalSales: { $sum: "$total" } } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: { $in: ["paid", "shipped", "delivered"] },
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers: usersCount,
      totalOrders: ordersCount,
      totalProducts: productsCount,
      totalSales: salesAgg[0]?.totalSales || 0,
      monthlySales,
    },
  });

  logBusinessEvent({
    req: _req,
    event: "admin.dashboard.viewed",
    entity: "admin",
    action: "view_dashboard",
    details: {
      totalUsers: usersCount,
      totalOrders: ordersCount,
      totalProducts: productsCount,
    },
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const { page, limit, skip } = buildPagination(req.query);

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email role isActive createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: buildPaginationMeta({ total, page, limit }),
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!["admin", "customer"].includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.role = role;
  await user.save();

  logBusinessEvent({
    req,
    event: "admin.user_role.updated",
    entity: "user",
    action: "update_role",
    details: {
      targetUserId: user._id,
      targetUserEmail: user.email,
      role,
    },
  });

  res.json({
    success: true,
    message: "User role updated",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
};
