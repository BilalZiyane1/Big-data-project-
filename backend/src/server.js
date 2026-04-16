const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const app = require("./app");
const connectDB = require("./config/db");
const { configureCloudinary } = require("./config/cloudinary");
const logger = require("./logging/logger");
const { startSystemLogging, stopSystemLogging } = require("./logging/systemLogger");

const PORT = process.env.PORT || 5000;
let httpServer;
let isShuttingDown = false;

const startHttpServer = () =>
  new Promise((resolve, reject) => {
    const server = app.listen(PORT);

    server.once("listening", () => resolve(server));
    server.once("error", (error) => reject(error));
  });

const finalizeShutdown = (code = 0) => {
  stopSystemLogging();

  if (typeof logger.closeStreams === "function") {
    logger.closeStreams();
  }

  process.exit(code);
};

const shutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(
    {
      event: "system.shutdown.initiated",
      signal,
    },
    "Graceful shutdown initiated"
  );

  if (!httpServer) {
    finalizeShutdown(0);
    return;
  }

  const forceExitTimeout = setTimeout(() => {
    logger.error(
      {
        event: "system.shutdown.timeout",
        timeoutMs: 10000,
      },
      "Forcing shutdown after timeout"
    );
    finalizeShutdown(1);
  }, 10000);
  forceExitTimeout.unref();

  httpServer.close(() => {
    clearTimeout(forceExitTimeout);
    logger.info({ event: "system.http.closed" }, "HTTP server stopped");
    finalizeShutdown(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const startServer = async () => {
  try {
    startSystemLogging();
    await connectDB();
    configureCloudinary();

    httpServer = await startHttpServer();
    logger.info(
      {
        event: "system.http.ready",
        port: Number(PORT),
      },
      "HTTP server started"
    );
  } catch (error) {
    if (error && error.code === "EADDRINUSE") {
      logger.fatal(
        {
          event: "system.startup.port_in_use",
          port: Number(PORT),
          error,
        },
        `Port ${PORT} is already in use`
      );
      finalizeShutdown(1);
      return;
    }

    logger.fatal(
      {
        event: "system.startup.failure",
        error,
      },
      "Failed to start server"
    );
    finalizeShutdown(1);
  }
};

startServer();
