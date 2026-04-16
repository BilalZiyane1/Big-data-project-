const express = require("express");
const { param, body } = require("express-validator");
const {
  getDashboardStats,
  getUsers,
  updateUserRole,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/stats", getDashboardStats);
router.get("/users", getUsers);
router.put(
  "/users/:id/role",
  [param("id").isMongoId(), body("role").isIn(["admin", "customer"])],
  validateRequest,
  updateUserRole
);

module.exports = router;
