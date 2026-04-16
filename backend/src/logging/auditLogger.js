/**
 * auditLogger.js — Business event logger
 *
 * Wraps pino with domain-specific helpers so controller code
 * stays clean while logs remain rich, structured, and
 * big-data–pipeline ready (JSON-ND, event-based schema).
 *
 * Every event carries:
 *  - event name  (dot-separated, machine-readable)
 *  - category    (business / ecommerce / auth / system)
 *  - entity      (product / order / cart / user / review / payment)
 *  - action      (create / update / delete / search / view …)
 *  - status      (success / failure / partial)
 *  - actor       (id + role; anonymous when unauthenticated)
 *  - request     (id + method + path)
 *  - client      (anonymised IP + parsed UA)
 *  - details     (sanitised, event-specific payload)
 *  - timestamp   (ISO-8601, added by pino)
 */

const logger          = require('./logger');
const { sanitizeForLog, anonymizeIp } = require('./sanitize');

// ─── Lightweight UA parser (no extra dependency) ──────────────────────────────

const parseUserAgent = (ua = '') => {
  if (!ua || ua === 'unknown') return { browser: 'unknown', os: 'unknown', device: 'unknown' };

  const browser =
    /Edg\//.test(ua)      ? 'Edge'
    : /OPR\//.test(ua)    ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua)? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : /curl\//.test(ua)   ? 'curl'
    : 'Other';

  const os =
    /Windows NT/.test(ua)     ? 'Windows'
    : /Macintosh/.test(ua)    ? 'macOS'
    : /iPhone|iPad/.test(ua)  ? 'iOS'
    : /Android/.test(ua)      ? 'Android'
    : /Linux/.test(ua)        ? 'Linux'
    : 'Other';

  const device =
    /iPhone|iPad|iPod|Android/.test(ua) ? 'mobile'
    : /Tablet|iPad/.test(ua)            ? 'tablet'
    : 'desktop';

  return { browser, os, device };
};

// ─── Shared context builders ───────────────────────────────────────────────────

const buildActor = (req) =>
  req?.user
    ? { id: String(req.user._id || req.user.id), role: req.user.role }
    : { id: null, role: 'anonymous' };

const buildRequest = (req) => ({
  requestId: req?.requestId,
  method:    req?.method,
  path:      req?.path,
  route:     req?.route?.path
    ? `${req.baseUrl || ''}${req.route.path}`
    : req?.path,
});

const buildClient = (req) => {
  const ua = req?.get?.('user-agent') || 'unknown';
  return {
    ip:        anonymizeIp(req?.ip || req?.socket?.remoteAddress || ''),
    userAgent: ua,
    parsed:    parseUserAgent(ua),
  };
};

// ─── Core log helper ──────────────────────────────────────────────────────────

/**
 * logBusinessEvent({ req, event, entity, action, status, details, level })
 *
 * @param {object} req       - Express request (optional but strongly recommended)
 * @param {string} event     - Machine-readable event name, e.g. 'product.created'
 * @param {string} entity    - Domain entity, e.g. 'product', 'order'
 * @param {string} action    - Verb, e.g. 'create', 'search', 'view'
 * @param {string} status    - 'success' | 'failure' | 'partial'
 * @param {object} details   - Arbitrary event-specific data (will be sanitised)
 * @param {string} level     - pino log level (default 'info')
 */
const logBusinessEvent = ({
  req,
  event,
  entity,
  action,
  status  = 'success',
  details = {},
  level   = 'info',
}) => {
  const payload = {
    event,
    category: 'business',
    entity,
    action,
    status,
    actor:   buildActor(req),
    request: buildRequest(req),
    client:  buildClient(req),
    details: sanitizeForLog(details),
  };

  const fn = typeof logger[level] === 'function' ? level : 'info';
  logger[fn](payload, `Business event: ${event}`);
};

// ─── Domain-specific helpers ───────────────────────────────────────────────────

/**
 * logEcommerceEvent — convenience wrapper with ecommerce category
 * and automatic funnel/revenue fields for analytics pipelines.
 */
const logEcommerceEvent = ({
  req,
  event,
  entity,
  action,
  status  = 'success',
  details = {},
  revenue = null,  // numeric total in USD if applicable
  level   = 'info',
}) => {
  const payload = {
    event,
    category: 'ecommerce',
    entity,
    action,
    status,
    actor:   buildActor(req),
    request: buildRequest(req),
    client:  buildClient(req),
    details: sanitizeForLog(details),
    ...(revenue !== null ? { revenue: Number(revenue.toFixed(2)) } : {}),
  };

  const fn = typeof logger[level] === 'function' ? level : 'info';
  logger[fn](payload, `Ecommerce event: ${event}`);
};

/**
 * logSecurityEvent — higher severity events related to auth, access, rate limits.
 */
const logSecurityEvent = ({
  req,
  event,
  action,
  status  = 'failure',
  details = {},
  level   = 'warn',
}) => {
  const payload = {
    event,
    category: 'security',
    entity:   'auth',
    action,
    status,
    actor:   buildActor(req),
    request: buildRequest(req),
    client:  buildClient(req),
    details: sanitizeForLog(details),
  };

  const fn = typeof logger[level] === 'function' ? level : 'warn';
  logger[fn](payload, `Security event: ${event}`);
};

module.exports = {
  logBusinessEvent,
  logEcommerceEvent,
  logSecurityEvent,
  // Export builders so other loggers can reuse them
  buildActor,
  buildRequest,
  buildClient,
};
