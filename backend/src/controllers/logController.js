/**
 * logController.js — Client telemetry ingestion endpoint
 *
 * Receives batched frontend events from telemetryClient.js,
 * validates, enriches with server-side context (IP, UA, requestId),
 * and writes each event to the structured log stream.
 *
 * Schema is intentionally compatible with big-data pipelines:
 * every event is a self-contained JSON document with stable
 * top-level keys suitable for partitioning / indexing.
 */

const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../logging/logger');
const { sanitizeForLog, anonymizeIp } = require('../logging/sanitize');
const { buildClient } = require('../logging/auditLogger');

const MAX_BATCH  = Number(process.env.CLIENT_LOG_BATCH_MAX     || 50);
const MAX_BYTES  = Number(process.env.CLIENT_LOG_EVENT_MAX_BYTES || 32 * 1024);
const ALLOWED_LEVELS = new Set(['trace','debug','info','warn','error','fatal']);

// Category allowlist (reject obviously malformed events)
const ALLOWED_CATEGORIES = new Set([
  'interaction','navigation','ecommerce','ecommerce_funnel',
  'search_funnel','performance','engagement','error',
  'auth','session','attribution','connectivity','frustration',
]);

const byteSize = (v) => {
  try { return Buffer.byteLength(JSON.stringify(v)); }
  catch { return Infinity; }
};

const normalizeEvent = (ev, req) => {
  if (!ev || typeof ev !== 'object') return null;

  const name = typeof ev.event === 'string' ? ev.event.trim() : '';
  if (!name) return null;

  const rawLevel = typeof ev.level === 'string' ? ev.level.toLowerCase() : 'info';
  const level    = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : 'info';

  const rawCat   = typeof ev.category === 'string' ? ev.category.toLowerCase() : 'interaction';
  const category = ALLOWED_CATEGORIES.has(rawCat) ? rawCat : 'interaction';

  return {
    event:        name,
    level,
    category,
    timestamp:    typeof ev.timestamp === 'string' ? ev.timestamp : new Date().toISOString(),
    sessionId:    typeof ev.sessionId  === 'string' ? ev.sessionId  : undefined,
    sessionAgeMs: typeof ev.sessionAgeMs === 'number' ? ev.sessionAgeMs : undefined,
    page:         sanitizeForLog(ev.page    || {}),
    user:         sanitizeForLog(ev.user    || {}),
    device:       sanitizeForLog(ev.device  || {}),
    details:      sanitizeForLog(ev.details || {}),
    metrics:      sanitizeForLog(ev.metrics || {}),
    tags:         sanitizeForLog(ev.tags    || []),
    requestId:    typeof ev.requestId === 'string' ? ev.requestId : req.requestId,
  };
};

const ingestClientLogs = asyncHandler(async (req, res) => {
  const incoming = Array.isArray(req.body?.events)
    ? req.body.events
    : [req.body];

  if (!incoming.length)
    throw new AppError('Telemetry payload cannot be empty', 400);

  if (incoming.length > MAX_BATCH)
    throw new AppError(`Too many events. Max: ${MAX_BATCH}`, 400);

  const clientCtx = buildClient(req);
  const actor = req.user
    ? { id: String(req.user._id || req.user.id), role: req.user.role }
    : { id: null, role: 'anonymous' };

  let accepted = 0;
  let rejected = 0;

  incoming.forEach((ev) => {
    if (byteSize(ev) > MAX_BYTES) {
      rejected++;
      logger.warn({
        event:     'client.telemetry.rejected',
        reason:    'payload_too_large',
        requestId: req.requestId,
      }, 'Client telemetry event rejected: payload too large');
      return;
    }

    const normalized = normalizeEvent(ev, req);
    if (!normalized) { rejected++; return; }

    // Top-level envelope — stable schema for big-data consumers
    logger[normalized.level]({
      event:     'client.telemetry',
      source:    'frontend',
      requestId: req.requestId,
      actor,
      client:    clientCtx,
      telemetry: normalized,
    }, 'Client telemetry event');

    accepted++;
  });

  res.status(202).json({
    success: true,
    message: 'Telemetry accepted',
    data: { accepted, rejected },
  });
});

module.exports = { ingestClientLogs };
