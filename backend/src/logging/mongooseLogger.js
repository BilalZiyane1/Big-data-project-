const logger = require("./logger");
const { sanitizeForLog } = require("./sanitize");

const enableMongooseQueryLogging = (mongoose) => {
  if (process.env.LOG_MONGOOSE_DEBUG !== "true") return;

  mongoose.set("debug", (collectionName, methodName, ...methodArgs) => {
    logger.debug(
      {
        event: "db.query",
        collection: collectionName,
        method: methodName,
        args: sanitizeForLog(methodArgs),
      },
      "Mongoose query"
    );
  });
};

module.exports = {
  enableMongooseQueryLogging,
};
