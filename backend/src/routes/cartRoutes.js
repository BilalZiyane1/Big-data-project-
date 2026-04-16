const express = require("express");
const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  addCartItemValidator,
  updateCartItemValidator,
  removeCartItemValidator,
} = require("../validators/cartValidators");

const router = express.Router();

router.use(protect);

router.get("/", getCart);
router.post("/items", addCartItemValidator, validateRequest, addCartItem);
router.put("/items/:productId", updateCartItemValidator, validateRequest, updateCartItem);
router.delete(
  "/items/:productId",
  removeCartItemValidator,
  validateRequest,
  removeCartItem
);
router.delete("/", clearCart);

module.exports = router;
