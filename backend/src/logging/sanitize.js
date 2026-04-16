const crypto = require("crypto");

const SENSITIVE_KEY_PATTERN = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|card|cvv|jwt|refresh/i;
const MAX_STRING_LENGTH = Number(process.env.LOG_MAX_STRING_LENGTH || 500);
const MAX_ARRAY_LENGTH = Number(process.env.LOG_MAX_ARRAY_LENGTH || 25);
const MAX_OBJECT_KEYS = Number(process.env.LOG_MAX_OBJECT_KEYS || 50);
const MAX_DEPTH = Number(process.env.LOG_MAX_DEPTH || 6);

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const truncateString = (value) => {
  if (typeof value !== "string") return value;
  if (value.length <= MAX_STRING_LENGTH) return value;

  return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated:${value.length - MAX_STRING_LENGTH}]`;
};

const summarizeBuffer = (value) => {
  if (!Buffer.isBuffer(value)) return value;

  return {
    type: "Buffer",
    length: value.length,
  };
};

const anonymizeIp = (ip = "") => {
  if (!ip || typeof ip !== "string") return "unknown";

  const normalized = ip.trim().replace(/^::ffff:/, "");

  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    return "::1";
  }

  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  if (normalized.includes(":")) {
    const chunks = normalized.split(":").filter(Boolean);
    if (!chunks.length) return "unknown";
    return `${chunks.slice(0, 3).join(":")}:*`;
  }

  return "unknown";
};

const hashValue = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 16);

const sanitizeForLog = (value, depth = 0, keyHint = "") => {
  if (value === null || typeof value === "undefined") return value;
  if (depth > MAX_DEPTH) return "[MaxDepthReached]";

  const normalizedKey = String(keyHint || "").toLowerCase();

  if (SENSITIVE_KEY_PATTERN.test(normalizedKey)) {
    return "[REDACTED]";
  }

  if (normalizedKey.includes("email") && typeof value === "string") {
    return `email_hash:${hashValue(value.trim().toLowerCase())}`;
  }

  if (typeof value === "string") return truncateString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return summarizeBuffer(value);
  }

  if (Array.isArray(value)) {
    const sliced = value.slice(0, MAX_ARRAY_LENGTH);
    const sanitized = sliced.map((item) => sanitizeForLog(item, depth + 1));

    if (value.length > MAX_ARRAY_LENGTH) {
      sanitized.push(`[${value.length - MAX_ARRAY_LENGTH} additional items]`);
    }

    return sanitized;
  }

  if (!isPlainObject(value)) {
    try {
      return truncateString(String(value));
    } catch (_error) {
      return "[UnserializableValue]";
    }
  }

  const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);
  const out = {};

  entries.forEach(([key, itemValue]) => {
    out[key] = sanitizeForLog(itemValue, depth + 1, key);
  });

  if (Object.keys(value).length > MAX_OBJECT_KEYS) {
    out.__truncatedKeys = Object.keys(value).length - MAX_OBJECT_KEYS;
  }

  return out;
};

module.exports = {
  sanitizeForLog,
  anonymizeIp,
};
