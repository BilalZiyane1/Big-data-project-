/**
 * FashionHub — Production Telemetry Client (v2)
 *
 * Designed for downstream big-data pipelines (JSON-ND compatible events).
 *
 * Signals captured:
 *  • Page views & SPA navigation     • Web Vitals (LCP, CLS, FCP, TTFB, FID)
 *  • Scroll depth milestones          • Time on page (per-route)
 *  • Rage-click detection             • Product card impressions
 *  • UTM / campaign attribution       • Device & viewport context
 *  • Cart lifecycle                   • Checkout funnel steps
 *  • Search funnel                    • Auth events
 *  • JS errors & promise rejections   • Network status changes
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TELEMETRY_ENDPOINT =
  import.meta.env.VITE_TELEMETRY_ENDPOINT || `${API_BASE}/logs/client`;

const CFG = {
  enabled:          import.meta.env.VITE_LOGGING_ENABLED !== 'false',
  sampleRate:       Number(import.meta.env.VITE_LOGGING_SAMPLE_RATE  ?? 1),
  batchSize:        Number(import.meta.env.VITE_LOGGING_BATCH_SIZE    ?? 25),
  maxQueueSize:     Number(import.meta.env.VITE_LOGGING_MAX_QUEUE_SIZE ?? 600),
  flushIntervalMs:  Number(import.meta.env.VITE_LOGGING_FLUSH_INTERVAL_MS ?? 5000),
  maxDepth:         5,
  maxStringLength:  300,
  maxArrayLength:   20,
  maxObjectKeys:    40,
  rageClickMs:      800,
  rageClickCount:   3,
  rageClickPx:      60,
  scrollDebounceMs: 200,
};

const SESSION_INCLUDED = Math.random() <= CFG.sampleRate;

// ─── Session State ─────────────────────────────────────────────────────────────

export const sessionId =
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const sessionStart     = Date.now();
let queue              = [];
let isFlushing         = false;
let initialized        = false;
let flushTimer         = null;
let userCtx            = { id: null, role: 'anonymous', isAuthenticated: false };
let pageViewStart      = Date.now();
let pageScrollDepthPct = 0;
let scrollDepthReported = new Set();
let scrollDebounceTimer = null;
let rageClickBuffer    = [];
let productViewStart   = null;

// ─── Sanitization ──────────────────────────────────────────────────────────────

const SENSITIVE = /password|token|secret|authorization|cookie|api[-_]?key|card|cvv|ssn|pin|otp/i;

const sanitize = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (depth > CFG.maxDepth) return '[MaxDepth]';
  if (typeof value === 'string')
    return value.length <= CFG.maxStringLength
      ? value
      : `${value.slice(0, CFG.maxStringLength)}…[trunc]`;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { message: value.message, name: value.name };
  if (Array.isArray(value))
    return value.slice(0, CFG.maxArrayLength).map(item => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    Object.entries(value).slice(0, CFG.maxObjectKeys).forEach(([k, v]) => {
      out[k] = SENSITIVE.test(k) ? '[REDACTED]' : sanitize(v, depth + 1);
    });
    return out;
  }
  return String(value);
};

// ─── Context ───────────────────────────────────────────────────────────────────

const getPageCtx = () => ({
  path:     window.location.pathname,
  search:   window.location.search,
  hash:     window.location.hash,
  title:    document.title,
  referrer: document.referrer || null,
  url:      window.location.href,
});

const getDeviceCtx = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    viewport:         { width: window.innerWidth,  height: window.innerHeight  },
    screen:           { width: window.screen.width, height: window.screen.height },
    devicePixelRatio: window.devicePixelRatio || 1,
    language:         navigator.language || 'unknown',
    platform:         navigator.platform  || 'unknown',
    touchSupport:     navigator.maxTouchPoints > 0,
    online:           navigator.onLine,
    cookiesEnabled:   navigator.cookieEnabled,
    doNotTrack:       navigator.doNotTrack === '1',
    connection: conn ? {
      effectiveType: conn.effectiveType,
      downlink:      conn.downlink,
      rtt:           conn.rtt,
      saveData:      conn.saveData,
    } : null,
  };
};

const captureUtm = () => {
  const p = new URLSearchParams(window.location.search);
  const utm = {};
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => {
    const v = p.get(k);
    if (v) utm[k.replace('utm_', '')] = v;
  });
  return Object.keys(utm).length ? utm : null;
};

// ─── Queue & Flush ─────────────────────────────────────────────────────────────

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = window.setInterval(() => flushTelemetry(), CFG.flushIntervalMs);
};

const enqueue = (event) => {
  if (queue.length >= CFG.maxQueueSize)
    queue = queue.slice(queue.length - CFG.maxQueueSize + 1);
  queue.push(event);
  if (queue.length >= CFG.batchSize) flushTelemetry();
};

const postPayload = async (payload, useBeacon = false) => {
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    return navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
  }
  const res = await fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
  return res.ok;
};

export const flushTelemetry = async ({ useBeacon = false } = {}) => {
  if (!queue.length || isFlushing) return;
  isFlushing = true;
  const batch = queue.splice(0, CFG.batchSize);
  try {
    const ok = await postPayload(JSON.stringify({ events: batch }), useBeacon);
    if (!ok) queue = [...batch, ...queue].slice(0, CFG.maxQueueSize);
  } catch {
    queue = [...batch, ...queue].slice(0, CFG.maxQueueSize);
  } finally {
    isFlushing = false;
  }
};

// ─── Core trackEvent ──────────────────────────────────────────────────────────

const shouldTrack = (force = false) => CFG.enabled && (force || SESSION_INCLUDED);

export const trackEvent = (event, payload = {}, options = {}) => {
  const { level = 'info', force = false } = options;
  if (!shouldTrack(force) || !event || typeof event !== 'string') return;

  enqueue({
    event,
    level,
    category:      payload.category  || 'interaction',
    timestamp:     new Date().toISOString(),
    sessionId,
    sessionAgeMs:  Date.now() - sessionStart,
    page:          sanitize(payload.page    || getPageCtx()),
    user:          sanitize(payload.user    || userCtx),
    device:        sanitize(payload.device  || getDeviceCtx()),
    details:       sanitize(payload.details || {}),
    metrics:       sanitize(payload.metrics || {}),
    tags:          sanitize(payload.tags    || []),
    requestId:     typeof payload.requestId === 'string' ? payload.requestId : undefined,
  });
};

export const setTelemetryUserContext = (ctx = {}) => {
  userCtx = {
    id:              ctx.id              || null,
    role:            ctx.role            || 'anonymous',
    isAuthenticated: Boolean(ctx.isAuthenticated),
  };
};

// ─── Web Vitals ────────────────────────────────────────────────────────────────

const observeVital = (type, cb) => {
  if (!('PerformanceObserver' in window)) return;
  try {
    new PerformanceObserver(list => list.getEntries().forEach(cb))
      .observe({ type, buffered: true });
  } catch { /* not supported */ }
};

const trackWebVitals = () => {
  // LCP
  observeVital('largest-contentful-paint', entry => {
    trackEvent('ui.performance.web_vital', {
      category: 'performance',
      details:  { name: 'LCP', valueMs: Number(entry.startTime.toFixed(2)) },
      tags: ['vital','lcp'],
    }, { force: true });
  });

  // CLS — accumulate, report on pagehide
  let clsValue = 0;
  observeVital('layout-shift', entry => {
    if (!entry.hadRecentInput) clsValue += entry.value;
  });
  window.addEventListener('pagehide', () => {
    if (clsValue > 0)
      trackEvent('ui.performance.web_vital', {
        category: 'performance',
        details: { name: 'CLS', value: Number(clsValue.toFixed(4)) },
        tags: ['vital','cls'],
      }, { force: true });
  }, { once: true });

  // FID
  observeVital('first-input', entry => {
    trackEvent('ui.performance.web_vital', {
      category: 'performance',
      details: { name: 'FID', valueMs: Number((entry.processingStart - entry.startTime).toFixed(2)) },
      tags: ['vital','fid'],
    }, { force: true });
  });

  // FCP (paint)
  observeVital('paint', entry => {
    if (entry.name === 'first-contentful-paint')
      trackEvent('ui.performance.web_vital', {
        category: 'performance',
        details: { name: 'FCP', valueMs: Number(entry.startTime.toFixed(2)) },
        tags: ['vital','fcp'],
      }, { force: true });
  });

  // TTFB from navigation timing
  const [nav] = performance.getEntriesByType('navigation');
  if (nav) {
    trackEvent('ui.performance.web_vital', {
      category: 'performance',
      details: { name: 'TTFB', valueMs: Number((nav.responseStart - nav.requestStart).toFixed(2)) },
      metrics: {
        dnsMs:           Number((nav.domainLookupEnd - nav.domainLookupStart).toFixed(2)),
        tcpMs:           Number((nav.connectEnd - nav.connectStart).toFixed(2)),
        transferSize:    nav.transferSize,
        domInteractiveMs:Number(nav.domInteractive.toFixed(2)),
        domCompleteMs:   Number(nav.domComplete.toFixed(2)),
      },
      tags: ['vital','ttfb'],
    }, { force: true });
  }
};

// ─── Scroll Depth ──────────────────────────────────────────────────────────────

const SCROLL_MILESTONES = [25, 50, 75, 90, 100];

const initScrollTracking = () => {
  window.addEventListener('scroll', () => {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = setTimeout(() => {
      const el   = document.documentElement;
      const pct  = Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100);
      if (pct > pageScrollDepthPct) pageScrollDepthPct = pct;
      SCROLL_MILESTONES.forEach(m => {
        if (pct >= m && !scrollDepthReported.has(m)) {
          scrollDepthReported.add(m);
          trackEvent('ui.engagement.scroll_depth', {
            category: 'engagement',
            details:  { milestone: m },
            metrics:  { depthPct: m, timeOnPageMs: Date.now() - pageViewStart },
          });
        }
      });
    }, CFG.scrollDebounceMs);
  }, { passive: true });
};

const reportTimeOnPage = () => {
  trackEvent('ui.engagement.time_on_page', {
    category: 'engagement',
    metrics: {
      durationMs:         Date.now() - pageViewStart,
      maxScrollDepthPct:  pageScrollDepthPct,
    },
  }, { force: true });
};

export const resetPageTracking = () => {
  reportTimeOnPage();
  pageViewStart       = Date.now();
  pageScrollDepthPct  = 0;
  scrollDepthReported = new Set();
};

// ─── Rage Click ────────────────────────────────────────────────────────────────

const initRageClickDetection = () => {
  document.addEventListener('click', e => {
    const now = Date.now();
    rageClickBuffer.push({ x: e.clientX, y: e.clientY, ts: now });
    rageClickBuffer = rageClickBuffer.filter(c => now - c.ts < CFG.rageClickMs);
    if (rageClickBuffer.length >= CFG.rageClickCount) {
      const xs = rageClickBuffer.map(c => c.x);
      const ys = rageClickBuffer.map(c => c.y);
      if ((Math.max(...xs)-Math.min(...xs)) < CFG.rageClickPx &&
          (Math.max(...ys)-Math.min(...ys)) < CFG.rageClickPx) {
        trackEvent('ui.interaction.rage_click', {
          category: 'frustration',
          details: {
            clickCount: rageClickBuffer.length,
            x: Math.round(e.clientX), y: Math.round(e.clientY),
            element: e.target?.tagName?.toLowerCase(),
            elementId: e.target?.id || undefined,
          },
        }, { level: 'warn', force: true });
        rageClickBuffer = [];
      }
    }
  }, { capture: true, passive: true });
};

// ─── Product Impressions ───────────────────────────────────────────────────────

export const createImpressionObserver = () => {
  if (!('IntersectionObserver' in window)) return { observe: () => {}, disconnect: () => {} };
  let pos = 0;
  return new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      pos++;
      trackEvent('ui.product.impression', {
        category: 'ecommerce',
        details: {
          productId:       el.dataset.productId,
          productName:     el.dataset.productName,
          productCategory: el.dataset.productCategory,
          productPrice:    el.dataset.productPrice ? Number(el.dataset.productPrice) : undefined,
          listPosition:    pos,
        },
      });
    });
  }, { threshold: 0.5 });
};

// ─── Checkout Funnel ───────────────────────────────────────────────────────────

export const trackCheckoutStep = (step, details = {}) => {
  trackEvent('ui.checkout.step', {
    category: 'ecommerce_funnel',
    details: { step, ...details },
    tags: ['checkout', step],
  });
};

// ─── Cart Events ───────────────────────────────────────────────────────────────

export const trackCartEvent = (action, details = {}) => {
  trackEvent(`ui.cart.${action}`, {
    category: 'ecommerce',
    details,
    tags: ['cart', action],
  });
};

// ─── Search Funnel ─────────────────────────────────────────────────────────────

export const trackSearchEvent = (action, details = {}) => {
  trackEvent(`ui.search.${action}`, {
    category: 'search_funnel',
    details,
    tags: ['search', action],
  });
};

// ─── Product View Timer ────────────────────────────────────────────────────────

export const startProductViewTimer = (productId, productName) => {
  productViewStart = { ts: Date.now(), productId, productName };
};

export const endProductViewTimer = () => {
  if (!productViewStart) return;
  const ms = Date.now() - productViewStart.ts;
  trackEvent('ui.product.view_duration', {
    category: 'engagement',
    details: { productId: productViewStart.productId, productName: productViewStart.productName },
    metrics: { durationMs: ms },
  });
  productViewStart = null;
};

// ─── Initialize ────────────────────────────────────────────────────────────────

export const initializeTelemetry = () => {
  if (initialized) return;
  initialized = true;

  scheduleFlush();
  initScrollTracking();
  initRageClickDetection();
  trackWebVitals();

  const utm = captureUtm();
  if (utm)
    trackEvent('ui.session.utm_captured', {
      category: 'attribution', details: { utm }, tags: ['utm'],
    }, { force: true });

  trackEvent('ui.session.started', {
    category: 'session',
    details: { device: getDeviceCtx(), referrer: document.referrer || null, utm },
  }, { force: true });

  window.addEventListener('error', e => {
    trackEvent('ui.error.javascript', {
      category: 'error',
      details: {
        message: e.message,
        source:  e.filename,
        line:    e.lineno,
        col:     e.colno,
        stack:   e.error?.stack?.slice(0, 500),
      },
    }, { level: 'error', force: true });
  });

  window.addEventListener('unhandledrejection', e => {
    trackEvent('ui.error.unhandled_rejection', {
      category: 'error',
      details: { reason: sanitize(e.reason) },
    }, { level: 'error', force: true });
  });

  window.addEventListener('pagehide', () => {
    reportTimeOnPage();
    flushTelemetry({ useBeacon: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTelemetry({ useBeacon: true });
  });

  window.addEventListener('offline', () =>
    trackEvent('ui.network.offline', { category: 'connectivity' }, { force: true }));
  window.addEventListener('online', () =>
    trackEvent('ui.network.online', { category: 'connectivity' }, { force: true }));
};
