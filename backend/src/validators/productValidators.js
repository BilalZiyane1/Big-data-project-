const { body, param, query } = require("express-validator");

const productIdValidator = [
  param("id").isMongoId().withMessage("Invalid product id"),
];

const createProductValidator = [
  body("name").trim().isLength({ min: 2, max: 150 }),
  body("description").trim().isLength({ min: 10, max: 3000 }),
  body("price").isFloat({ min: 0 }),
  body("category").isIn(["men", "women", "kids"]),
  body("sizes").isArray({ min: 1 }).withMessage("At least one size is required"),
  body("colors").isArray({ min: 1 }).withMessage("At least one color is required"),
  body("stockQuantity").isInt({ min: 0 }),
  body("images").optional().isArray(),
];

const updateProductValidator = [
  body("name").optional().trim().isLength({ min: 2, max: 150 }),
  body("description").optional().trim().isLength({ min: 10, max: 3000 }),
  body("price").optional().isFloat({ min: 0 }),
  body("category").optional().isIn(["men", "women", "kids"]),
  body("sizes").optional().isArray({ min: 1 }),
  body("colors").optional().isArray({ min: 1 }),
  body("stockQuantity").optional().isInt({ min: 0 }),
  body("images").optional().isArray(),
];

const productFilterValidator = [
  query("page").optional({ values: "falsy" }).isInt({ min: 1 }),
  query("limit").optional({ values: "falsy" }).isInt({ min: 1, max: 100 }),
  query("minPrice").optional({ values: "falsy" }).isFloat({ min: 0 }),
  query("maxPrice").optional({ values: "falsy" }).isFloat({ min: 0 }),
  query("category").optional({ values: "falsy" }).isIn(["men", "women", "kids"]),
];

const reviewValidator = [
  param("id").isMongoId().withMessage("Invalid product id"),
  body("rating").isInt({ min: 1, max: 5 }),
  body("comment").optional().trim().isLength({ max: 1200 }),
];

module.exports = {
  productIdValidator,
  createProductValidator,
  updateProductValidator,
  productFilterValidator,
  reviewValidator,
};
