const { randomUUID } = require("crypto");
const logger = require("./logger");
const { sanitizeForLog, anonymizeIp } = require("./sanitize");

const REQUEST_ID_HEADER = "x-request-id";
const SLOW_REQUEST_THRESHOLD_MS = Number(process.env.LOG_SLOW_REQUEST_THRESHOLD_MS || 1000);
const CAPTURE_REQUEST_BODY = process.env.LOG_CAPTURE_REQUEST_BODY !== "false";
const CAPTURE_RESPONSE_BODY = process.env.LOG_CAPTURE_RESPONSE_BODY !== "false";
const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getLevelFromStatus = (statusCode, durationMs) => {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) return "warn";
  return "info";
};

const assignRequestId = (req, res, next) => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof incoming === "string" && incoming.trim() ? incoming.trim() : randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};

const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const startedAtIso = new Date().toISOString();
  const isClientTelemetryIngest = req.path === "/api/logs/client";

  let responseBody;
  let responseBodySize = 0;

  if (CAPTURE_RESPONSE_BODY) {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = (body) => {
      responseBody = body;
      try {
        responseBodySize = Buffer.byteLength(JSON.stringify(body));
      } catch (_error) {
        responseBodySize = 0;
      }
      return originalJson(body);
    };

    res.send = (body) => {
      if (typeof responseBody === "undefined") {
        responseBody = body;
        if (typeof body === "string") {
          responseBodySize = Buffer.byteLength(body);
        } else if (Buffer.isBuffer(body)) {
          responseBodySize = body.length;
        }
      }

      return originalSend(body);
    };
  }

  const requestPayload = {
    event: "api.request.started",
    requestId: req.requestId,
    request: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      query: sanitizeForLog(req.query),
      params: sanitizeForLog(req.params),
      userAgent: req.get("user-agent") || "unknown",
      referrer: req.get("referer") || "",
      ip: anonymizeIp(req.ip || req.socket?.remoteAddress || ""),
      receivedAt: startedAtIso,
    },
  };

  if (CAPTURE_REQUEST_BODY && BODY_METHODS.has(req.method)) {
    requestPayload.request.body = isClientTelemetryIngest
      ? {
          eventsCount: Array.isArray(req.body?.events) ? req.body.events.length : 1,
        }
      : sanitizeForLog(req.body);
  }

  logger.info(requestPayload, "API request received");

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = getLevelFromStatus(res.statusCode, durationMs);
    const route = req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : req.path;

    const payload = {
      event: "api.request.completed",
      requestId: req.requestId,
      actor: req.user
        ? {
            id: String(req.user._id || req.user.id),
            role: req.user.role,
          }
        : {
            id: null,
            role: "anonymous",
          },
      request: {
        method: req.method,
        path: req.path,
        route,
      },
      response: {
        statusCode: res.statusCode,
        bytes: Number(res.getHeader("content-length") || responseBodySize || 0),
      },
      performance: {
        durationMs: Number(durationMs.toFixed(2)),
        isSlow: durationMs >= SLOW_REQUEST_THRESHOLD_MS,
      },
    };

    if (CAPTURE_RESPONSE_BODY && typeof responseBody !== "undefined") {
      payload.response.body = sanitizeForLog(responseBody);
    }

    logger[level](payload, "API request completed");
  });

  res.on("close", () => {
    if (res.writableEnded) return;

    logger.warn(
      {
        event: "api.request.aborted",
        requestId: req.requestId,
        request: {
          method: req.method,
          path: req.path,
        },
      },
      "API request aborted by client"
    );
  });

  next();
};

module.exports = {
  assignRequestId,
  requestLogger,
};
