const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");
const { logBusinessEvent } = require("../logging/auditLogger");

const sanitizeUser = (userDoc) => ({
  id: userDoc._id,
  name: userDoc.name,
  email: userDoc.email,
  role: userDoc.role,
  avatar: userDoc.avatar,
  createdAt: userDoc.createdAt,
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const token = generateToken({ id: user._id, role: user.role });

  logBusinessEvent({
    req,
    event: "auth.register.success",
    entity: "user",
    action: "register",
    details: {
      userId: user._id,
      role: user.role,
      email,
    },
  });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken({ id: user._id, role: user.role });

  logBusinessEvent({
    req,
    event: "auth.login.success",
    entity: "user",
    action: "login",
    details: {
      userId: user._id,
      role: user.role,
      email,
    },
  });

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  logBusinessEvent({
    req,
    event: "auth.session.fetch",
    entity: "user",
    action: "get_current_user",
    details: {
      userId: user?._id,
      role: user?.role,
    },
  });

  res.json({
    success: true,
    data: sanitizeUser(user),
  });
});

const logout = asyncHandler(async (_req, res) => {
  logBusinessEvent({
    req: _req,
    event: "auth.logout",
    entity: "user",
    action: "logout",
  });

  res.json({
    success: true,
    message: "Logout successful. Remove token on client side.",
  });
});

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
