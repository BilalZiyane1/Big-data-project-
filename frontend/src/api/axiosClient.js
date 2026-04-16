import axios from "axios";
import { trackEvent } from "../telemetry/telemetryClient";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: false,
});

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const shouldTrackTelemetry = (url = "") => !String(url).includes("/logs/client");

const normalizePath = (url = "") => {
  try {
    return new URL(url, axiosClient.defaults.baseURL).pathname;
  } catch (_error) {
    return String(url || "");
  }
};

axiosClient.interceptors.request.use((config) => {
  config.metadata = {
    startedAt: now(),
  };

  const token = localStorage.getItem("fashionHubToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (shouldTrackTelemetry(config.url)) {
    trackEvent("api.client.request", {
      category: "api",
      details: {
        method: (config.method || "get").toUpperCase(),
        path: normalizePath(config.url),
      },
    });
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    if (shouldTrackTelemetry(response.config?.url)) {
      const durationMs = Number((now() - (response.config?.metadata?.startedAt || now())).toFixed(2));
      const requestId = response.headers?.["x-request-id"];

      trackEvent("api.client.response", {
        category: "api",
        requestId,
        details: {
          method: (response.config?.method || "get").toUpperCase(),
          path: normalizePath(response.config?.url),
          statusCode: response.status,
        },
        metrics: {
          durationMs,
        },
      });
    }

    return response;
  },
  (error) => {
    const config = error.config || {};

    if (shouldTrackTelemetry(config.url)) {
      const durationMs = Number((now() - (config.metadata?.startedAt || now())).toFixed(2));
      const requestId = error.response?.headers?.["x-request-id"];

      trackEvent(
        "api.client.error",
        {
          category: "error",
          requestId,
          details: {
            method: (config.method || "get").toUpperCase(),
            path: normalizePath(config.url),
            statusCode: error.response?.status || null,
            message: error.response?.data?.message || error.message,
          },
          metrics: {
            durationMs,
          },
        },
        { level: "warn", force: true }
      );
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
