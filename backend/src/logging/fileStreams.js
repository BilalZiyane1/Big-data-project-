const fs = require("fs");
const path = require("path");
const { Writable } = require("stream");

const toBoolean = (value, defaultValue) => {
  if (typeof value === "undefined") return defaultValue;
  return String(value).trim().toLowerCase() === "true";
};

const backendRoot = path.resolve(__dirname, "../..");

const resolveLogDir = () => {
  const configuredPath = process.env.LOG_FILE_DIR || "logs";

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(backendRoot, configuredPath);
};

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const pad2 = (value) => String(value).padStart(2, "0");

const getDateParts = (date, useUtc) => {
  const year = useUtc ? date.getUTCFullYear() : date.getFullYear();
  const month = useUtc ? date.getUTCMonth() + 1 : date.getMonth() + 1;
  const day = useUtc ? date.getUTCDate() : date.getDate();
  const hour = useUtc ? date.getUTCHours() : date.getHours();

  return {
    day: `${year}-${pad2(month)}-${pad2(day)}`,
    hour: pad2(hour),
  };
};

class TimeBucketedNdjsonStream extends Writable {
  constructor({ logDir, fileName, useUtc }) {
    super();
    this.logDir = logDir;
    this.fileName = fileName;
    this.useUtc = useUtc;
    this.activeBucketKey = null;
    this.activeFileStream = null;
  }

  buildBucket(now) {
    const { day, hour } = getDateParts(now, this.useUtc);
    return {
      day,
      hour,
      key: `${day}/${hour}`,
    };
  }

  switchBucketIfNeeded(now) {
    const targetBucket = this.buildBucket(now);
    if (targetBucket.key === this.activeBucketKey && this.activeFileStream) {
      return;
    }

    if (this.activeFileStream) {
      this.activeFileStream.end();
      this.activeFileStream = null;
    }

    const bucketDir = path.join(this.logDir, targetBucket.day, targetBucket.hour);
    ensureDirectory(bucketDir);

    const targetFilePath = path.join(bucketDir, this.fileName);
    const nextStream = fs.createWriteStream(targetFilePath, {
      flags: "a",
      encoding: "utf8",
    });

    nextStream.on("error", (error) => {
      this.emit("error", error);
    });

    this.activeFileStream = nextStream;
    this.activeBucketKey = targetBucket.key;
  }

  _write(chunk, _encoding, callback) {
    try {
      this.switchBucketIfNeeded(new Date());
      const payload = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      this.activeFileStream.write(payload, callback);
    } catch (error) {
      callback(error);
    }
  }

  _final(callback) {
    if (!this.activeFileStream) {
      callback();
      return;
    }

    const streamToClose = this.activeFileStream;
    this.activeFileStream = null;
    this.activeBucketKey = null;
    streamToClose.end(callback);
  }
};

const createFileStreams = () => {
  const enableFileLogs = toBoolean(process.env.LOG_ENABLE_FILES, true);

  if (!enableFileLogs) {
    return {
      streams: [],
      close: () => {},
      logDir: null,
    };
  }

  const logDir = resolveLogDir();
  ensureDirectory(logDir);

  const useUtc = toBoolean(process.env.LOG_FILE_USE_UTC, false);

  const appStream = new TimeBucketedNdjsonStream({
    logDir,
    fileName: "app.ndjson",
    useUtc,
  });

  const errorStream = new TimeBucketedNdjsonStream({
    logDir,
    fileName: "error.ndjson",
    useUtc,
  });

  const fileLevel = process.env.LOG_FILE_LEVEL || "trace";
  const errorLevel = process.env.LOG_ERROR_FILE_LEVEL || "warn";

  const streams = [
    {
      level: fileLevel,
      stream: appStream,
    },
    {
      level: errorLevel,
      stream: errorStream,
    },
  ];

  const close = () => {
    [appStream, errorStream].forEach((stream) => {
      try {
        stream.end();
      } catch (_error) {
        // Ignore close failures during shutdown.
      }
    });
  };

  return {
    streams,
    close,
    logDir,
    pathPattern: "YYYY-MM-DD/HH/<stream>.ndjson",
    useUtc,
  };
};

module.exports = {
  createFileStreams,
  resolveLogDir,
};
