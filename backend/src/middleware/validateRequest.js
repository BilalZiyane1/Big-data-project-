const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");

const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new AppError("Validation failed", 400);
    error.errors = errors.array();
    return next(error);
  }

  return next();
};

module.exports = validateRequest;
