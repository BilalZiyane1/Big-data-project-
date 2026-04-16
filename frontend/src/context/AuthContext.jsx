import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser, registerUser } from "../api/authApi";
import { setTelemetryUserContext, trackEvent } from "../telemetry/telemetryClient";

const AuthContext = createContext(null);

const TOKEN_KEY = "fashionHubToken";
const USER_KEY = "fashionHubUser";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  const persistAuth = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));

    setTelemetryUserContext({
      id: nextUser?.id || null,
      role: nextUser?.role || "customer",
      isAuthenticated: Boolean(nextToken),
    });

    trackEvent("auth.session.persisted", {
      category: "auth",
      details: {
        userId: nextUser?.id,
        role: nextUser?.role,
      },
    });
  }, []);

  const clearAuth = useCallback(() => {
    trackEvent("auth.session.cleared", {
      category: "auth",
      details: {
        hadToken: Boolean(localStorage.getItem(TOKEN_KEY)),
      },
    });

    setToken("");
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setTelemetryUserContext({
      id: null,
      role: "anonymous",
      isAuthenticated: false,
    });
  }, []);

  const login = useCallback(
    async (payload) => {
      const response = await loginUser(payload);
      persistAuth(response.data.token, response.data.user);

      trackEvent("auth.login.success", {
        category: "auth",
        details: {
          userId: response.data.user?.id,
          role: response.data.user?.role,
        },
      });

      return response;
    },
    [persistAuth]
  );

  const register = useCallback(
    async (payload) => {
      const response = await registerUser(payload);
      persistAuth(response.data.token, response.data.user);

      trackEvent("auth.register.success", {
        category: "auth",
        details: {
          userId: response.data.user?.id,
          role: response.data.user?.role,
        },
      });

      return response;
    },
    [persistAuth]
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await getCurrentUser();
      setUser(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));

      setTelemetryUserContext({
        id: response.data?.id || null,
        role: response.data?.role || "customer",
        isAuthenticated: true,
      });

      trackEvent("auth.session.refreshed", {
        category: "auth",
        details: {
          userId: response.data?.id,
          role: response.data?.role,
        },
      });
    } catch (error) {
      trackEvent(
        "auth.session.refresh_failed",
        {
          category: "auth",
          details: {
            message: error?.response?.data?.message || error?.message || "Unknown auth refresh error",
          },
        },
        { level: "warn", force: true }
      );

      clearAuth();
      throw error;
    }
  }, [clearAuth, token]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token, refreshUser]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === "admin",
      login,
      register,
      refreshUser,
      logout: clearAuth,
      setUser,
    }),
    [token, user, loading, login, register, refreshUser, clearAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside AuthProvider");
  return context;
};
