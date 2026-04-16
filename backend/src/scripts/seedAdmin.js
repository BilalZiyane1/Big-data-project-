const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const connectDB = require("../config/db");
const User = require("../models/User");

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || "admin@fashionhub.com";
    const password = process.env.ADMIN_PASSWORD || "Admin1234";
    const name = process.env.ADMIN_NAME || "Admin User";

    let admin = await User.findOne({ email });

    if (!admin) {
      admin = await User.create({
        name,
        email,
        password,
        role: "admin",
      });
      // eslint-disable-next-line no-console
      console.log(`Admin user created: ${admin.email}`);
    } else {
      admin.role = "admin";
      await admin.save();
      // eslint-disable-next-line no-console
      console.log(`Existing user promoted to admin: ${admin.email}`);
    }

    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to seed admin", error);
    process.exit(1);
  }
};

seedAdmin();
