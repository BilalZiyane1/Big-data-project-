const express = require("express");
const { upload, uploadImage } = require("../controllers/uploadController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/image", protect, authorize("admin"), upload.single("image"), uploadImage);

module.exports = router;
