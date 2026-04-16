const multer = require("multer");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { uploadToCloudinary } = require("../config/cloudinary");
const { logBusinessEvent } = require("../logging/auditLogger");

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new AppError("Only image uploads are allowed", 400));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Image file is required", 400);
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError("Cloudinary is not configured", 500);
  }

  const uploadResult = await uploadToCloudinary({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
  });

  logBusinessEvent({
    req,
    event: "media.image.uploaded",
    entity: "media",
    action: "upload",
    details: {
      publicId: uploadResult.public_id,
      contentType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({
    success: true,
    message: "Image uploaded",
    data: {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    },
  });
});

module.exports = {
  upload,
  uploadImage,
};
