const { body } = require("express-validator");

const registerValidator = [
  body("name").trim().isLength({ min: 2, max: 60 }).withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+/)
    .withMessage("Password must contain uppercase, lowercase and number"),
];

const loginValidator = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateProfileValidator = [
  body("name").optional().trim().isLength({ min: 2, max: 60 }),
  body("email").optional().isEmail().normalizeEmail(),
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
};
