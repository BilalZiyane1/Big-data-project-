const AppError = require("../utils/AppError");
const logger = require("../logging/logger");
const { sanitizeForLog } = require("../logging/sanitize");

const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  const level = statusCode >= 500 ? "error" : "warn";
  const logPayload = {
    event: "api.error",
    requestId: req.requestId,
    actor: req.user
      ? {
          id: String(req.user._id || req.user.id),
          role: req.user.role,
        }
      : {
          id: null,
          role: "anonymous",
        },
    request: {
      method: req.method,
      path: req.originalUrl,
      params: sanitizeForLog(req.params),
      query: sanitizeForLog(req.query),
      body: sanitizeForLog(req.body),
    },
    error: {
      name: err.name,
      message,
      statusCode,
      isOperational: Boolean(err.isOperational),
      details: Array.isArray(err.errors) ? sanitizeForLog(err.errors) : undefined,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    },
  };

  logger[level](logPayload, "API error handled");

  res.status(statusCode).json({
    success: false,
    status: err.status || "error",
    message,
    ...(Array.isArray(err.errors) && { errors: err.errors }),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};
