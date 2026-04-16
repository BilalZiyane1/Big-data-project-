const { v2: cloudinary } = require("cloudinary");

const configureCloudinary = () => {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
};

const uploadToCloudinary = async ({ buffer, mimetype, folder = "fashion-hub" }) => {
  const payload = `data:${mimetype};base64,${buffer.toString("base64")}`;
  return cloudinary.uploader.upload(payload, {
    folder,
    resource_type: "image",
  });
};

module.exports = {
  cloudinary,
  configureCloudinary,
  uploadToCloudinary,
};
