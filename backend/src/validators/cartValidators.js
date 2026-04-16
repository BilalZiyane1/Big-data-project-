const { body, param } = require("express-validator");

const addCartItemValidator = [
  body("productId").isMongoId().withMessage("Valid productId is required"),
  body("quantity").isInt({ min: 1, max: 99 }),
  body("size").optional().isIn(["XS", "S", "M", "L", "XL", "XXL"]),
  body("color").optional().trim().isLength({ min: 1, max: 30 }),
];

const updateCartItemValidator = [
  param("productId").isMongoId(),
  body("quantity").isInt({ min: 1, max: 99 }),
];

const removeCartItemValidator = [
  param("productId").isMongoId(),
];

module.exports = {
  addCartItemValidator,
  updateCartItemValidator,
  removeCartItemValidator,
};
