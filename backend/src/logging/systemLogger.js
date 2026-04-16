const os = require("os");
const logger = require("./logger");
const { sanitizeForLog } = require("./sanitize");

const METRICS_INTERVAL_MS = Number(process.env.LOG_SYSTEM_METRICS_INTERVAL_MS || 60000);

let initialized = false;
let metricsInterval;

const getSystemMetrics = () => {
  const memory = process.memoryUsage();

  return {
    pid: process.pid,
    uptimeSec: Number(process.uptime().toFixed(2)),
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers,
    },
    loadAverage: os.loadavg(),
    freeMemory: os.freemem(),
    totalMemory: os.totalmem(),
  };
};

const startSystemLogging = () => {
  if (initialized) return;
  initialized = true;

  logger.info(
    {
      event: "system.startup",
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: process.env.NODE_ENV || "development",
      },
    },
    "Application startup"
  );

  process.on("warning", (warning) => {
    logger.warn(
      {
        event: "system.warning",
        warning: {
          name: warning.name,
          message: warning.message,
          stack: warning.stack,
        },
      },
      "Node.js process warning"
    );
  });

  process.on("unhandledRejection", (reason) => {
    logger.error(
      {
        event: "system.unhandled_rejection",
        reason: sanitizeForLog(reason),
      },
      "Unhandled promise rejection"
    );
  });

  process.on("SIGINT", () => {
    logger.info({ event: "system.signal", signal: "SIGINT" }, "Shutdown signal received");
  });

  process.on("SIGTERM", () => {
    logger.info({ event: "system.signal", signal: "SIGTERM" }, "Shutdown signal received");
  });

  if (METRICS_INTERVAL_MS > 0) {
    metricsInterval = setInterval(() => {
      logger.info(
        {
          event: "system.metrics",
          metrics: getSystemMetrics(),
        },
        "Runtime metrics snapshot"
      );
    }, METRICS_INTERVAL_MS);

    metricsInterval.unref();
  }
};

const stopSystemLogging = () => {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = undefined;
  }
};

module.exports = {
  startSystemLogging,
  stopSystemLogging,
};
