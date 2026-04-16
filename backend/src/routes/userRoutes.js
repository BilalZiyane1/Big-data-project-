const express = require("express");
const { param } = require("express-validator");
const {
  getProfile,
  updateProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { updateProfileValidator } = require("../validators/authValidators");

const router = express.Router();

router.use(protect);

router.get("/me", getProfile);
router.put("/me", updateProfileValidator, validateRequest, updateProfile);

router.get("/wishlist", getWishlist);
router.post(
  "/wishlist/:productId",
  param("productId").isMongoId(),
  validateRequest,
  addToWishlist
);
router.delete(
  "/wishlist/:productId",
  param("productId").isMongoId(),
  validateRequest,
  removeFromWishlist
);

module.exports = router;
