const express = require("express");
const {
  register,
  login,
  getCurrentUser,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { registerValidator, loginValidator } = require("../validators/authValidators");

const router = express.Router();

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginValidator, validateRequest, login);
router.post("/logout", logout);
router.get("/me", protect, getCurrentUser);

module.exports = router;
