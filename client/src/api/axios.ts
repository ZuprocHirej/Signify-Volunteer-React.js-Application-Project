import axios from "axios";

/**
 * Shared Axios client instance.
 * Configured with baseURL from environment variables and automated JWT interceptors.
 */
const TOKEN_KEY = "volunteer_portal_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: automatically attaches JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handles centralized errors and expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginOrRegister =
        window.location.pathname.includes("/login") ||
        window.location.pathname.includes("/register");

      if (!isLoginOrRegister) {
        localStorage.removeItem(TOKEN_KEY);
        const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const loginUrl = new URL("/login", window.location.origin);
        loginUrl.searchParams.set(
          "message",
          "Your session expired, please log in again."
        );
        loginUrl.searchParams.set("returnTo", returnTo);
        window.location.assign(loginUrl.toString());
      }
    }
    return Promise.reject(error);
  }
);

export default api;
