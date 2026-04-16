const express = require("express");
const {
  createOrder,
  createPaymentIntent,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createOrderValidator,
  orderIdValidator,
  updateOrderStatusValidator,
  listOrderValidator,
} = require("../validators/orderValidators");

const router = express.Router();

router.use(protect);

router.post("/", createOrderValidator, validateRequest, createOrder);
router.post("/payment-intent", createPaymentIntent);
router.get("/my", listOrderValidator, validateRequest, getMyOrders);
router.get("/:id", orderIdValidator, validateRequest, getOrderById);

router.get(
  "/admin/all",
  authorize("admin"),
  listOrderValidator,
  validateRequest,
  getAllOrders
);

router.put(
  "/admin/:id/status",
  authorize("admin"),
  updateOrderStatusValidator,
  validateRequest,
  updateOrderStatus
);

module.exports = router;
