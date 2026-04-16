const mongoose = require("mongoose");
const logger = require("../logging/logger");
const { enableMongooseQueryLogging } = require("../logging/mongooseLogger");

const getMongoHost = (uri = "") => {
  const normalized = uri.replace("mongodb://", "").replace("mongodb+srv://", "");
  const hostSection = normalized.split("/")[0] || "unknown";
  const host = hostSection.includes("@") ? hostSection.split("@")[1] : hostSection;
  return host || "unknown";
};

const connectDB = async () => {
  mongoose.set("strictQuery", true);
  enableMongooseQueryLogging(mongoose);

  await mongoose.connect(process.env.MONGO_URI);

  logger.info(
    {
      event: "db.connected",
      database: {
        host: getMongoHost(process.env.MONGO_URI || ""),
        name: mongoose.connection.name,
      },
    },
    "MongoDB connected"
  );
};

module.exports = connectDB;
