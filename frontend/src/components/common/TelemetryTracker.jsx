import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
  flushTelemetry,
  initializeTelemetry,
  resetPageTracking,
  setTelemetryUserContext,
  trackEvent,
} from '../../telemetry/telemetryClient';

const safeText = (v = '') => String(v).replace(/\s+/g, ' ').trim().slice(0, 120);

const extractEl = (el) => ({
  tag:       el.tagName.toLowerCase(),
  id:        el.id        || undefined,
  className: safeText(el.className   || '') || undefined,
  text:      safeText(el.textContent || '') || undefined,
  href:      el.getAttribute?.('href')      || undefined,
  name:      el.getAttribute?.('name')      || undefined,
  type:      el.getAttribute?.('type')      || undefined,
  dataId:    el.dataset?.productId          || undefined,
});

const TelemetryTracker = () => {
  const location              = useLocation();
  const { user, isAuthenticated } = useAuth();
  const lastRouteRef          = useRef('');
  const isFirstRender         = useRef(true);

  // Boot once
  useEffect(() => {
    initializeTelemetry();
    return () => flushTelemetry({ useBeacon: true });
  }, []);

  // Sync user context whenever auth changes
  useEffect(() => {
    setTelemetryUserContext({
      id:              user?.id   || user?._id || null,
      role:            user?.role || 'anonymous',
      isAuthenticated,
    });
  }, [user, isAuthenticated]);

  // SPA navigation tracking
  useEffect(() => {
    const routeKey = `${location.pathname}${location.search}${location.hash}`;
    if (lastRouteRef.current === routeKey) return;

    // Don't call resetPageTracking on the very first render (no previous page)
    if (!isFirstRender.current) {
      resetPageTracking();
    }
    isFirstRender.current  = false;
    lastRouteRef.current   = routeKey;

    trackEvent('ui.page.viewed', {
      category: 'navigation',
      details: {
        path:   location.pathname,
        search: location.search,
        hash:   location.hash,
      },
    });
  }, [location.pathname, location.search, location.hash]);

  // Global click + submit delegation
  useEffect(() => {
    const onClick = (e) => {
      if (!(e.target instanceof Element)) return;
      const target = e.target.closest("a,button,[role='button'],input[type='submit']");
      if (!target) return;
      trackEvent('ui.interaction.click', {
        category: 'interaction',
        details:  extractEl(target),
      });
    };

    const onSubmit = (e) => {
      if (!(e.target instanceof HTMLFormElement)) return;
      trackEvent('ui.form.submitted', {
        category: 'interaction',
        details: {
          id:     e.target.id                    || undefined,
          name:   e.target.getAttribute('name')  || undefined,
          action: e.target.getAttribute('action')|| undefined,
        },
      });
    };

    document.addEventListener('click',  onClick,  true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click',  onClick,  true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  return null;
};

export default TelemetryTracker;
