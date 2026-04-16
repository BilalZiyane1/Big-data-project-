const pino = require("pino");
const { createFileStreams } = require("./fileStreams");

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
const ENABLE_STDOUT = String(process.env.LOG_ENABLE_STDOUT || "true").toLowerCase() === "true";

const loggerOptions = {
  level: LOG_LEVEL,
  name: "fashion-hub-api",
  base: {
    service: "fashion-hub-api",
    environment: process.env.NODE_ENV || "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "request.headers.authorization",
      "request.headers.cookie",
      "request.body.password",
      "request.body.token",
      "request.body.refreshToken",
      "response.body.token",
      "error.config.headers.Authorization",
      "error.config.headers.authorization",
      "actor.email",
      "details.email",
    ],
    censor: "[REDACTED]",
  },
};

const streams = [];

if (ENABLE_STDOUT) {
  streams.push({
    level: LOG_LEVEL,
    stream: process.stdout,
  });
}

const {
  streams: fileStreams,
  close: closeFileStreams,
  logDir,
  pathPattern,
  useUtc,
} = createFileStreams();
if (fileStreams.length) {
  streams.push(...fileStreams);
}

const logger = streams.length
  ? pino(loggerOptions, pino.multistream(streams))
  : pino(loggerOptions);

logger.closeStreams = closeFileStreams;

if (logDir) {
  logger.info(
    {
      event: "system.logging.file_sink.enabled",
      logDir,
      pathPattern,
      useUtc,
      streams: ["app.ndjson", "error.ndjson"],
    },
    "Time-bucketed file log sink enabled"
  );
}

module.exports = logger;
