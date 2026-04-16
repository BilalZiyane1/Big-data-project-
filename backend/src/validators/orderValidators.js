const { body, param, query } = require("express-validator");

const shippingAddressRules = [
  body("shippingAddress.fullName").trim().notEmpty(),
  body("shippingAddress.phone").trim().notEmpty(),
  body("shippingAddress.addressLine1").trim().notEmpty(),
  body("shippingAddress.city").trim().notEmpty(),
  body("shippingAddress.state").trim().notEmpty(),
  body("shippingAddress.postalCode").trim().notEmpty(),
  body("shippingAddress.country").trim().notEmpty(),
];

const createOrderValidator = [
  body("paymentMethod").optional().isIn(["mock", "stripe"]),
  ...shippingAddressRules,
];

const orderIdValidator = [
  param("id").isMongoId().withMessage("Invalid order id"),
];

const updateOrderStatusValidator = [
  param("id").isMongoId(),
  body("status").isIn(["pending", "paid", "shipped", "delivered", "cancelled"]),
];

const listOrderValidator = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("status")
    .optional()
    .isIn(["pending", "paid", "shipped", "delivered", "cancelled"]),
];

module.exports = {
  createOrderValidator,
  orderIdValidator,
  updateOrderStatusValidator,
  listOrderValidator,
};
