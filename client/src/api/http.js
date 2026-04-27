import axios from "axios";
import { clearSession, getAccessToken, getRefreshToken, setSessionTokens } from "../app/auth";

let configured = false;
let refreshPromise = null;

export function setupHttpClient() {
  if (configured) return;

  configured = true;
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "";
  axios.defaults.timeout = 15000;

  axios.interceptors.request.use((config) => {
    const token = getAccessToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error?.config;
      const isUnauthorized = error?.response?.status === 401;
      const isAuthRequest =
        originalRequest?.url?.includes("/api/auth/token/") ||
        originalRequest?.url?.includes("/api/auth/token/refresh/");

      if (isUnauthorized && originalRequest && !originalRequest._retry && !isAuthRequest) {
        const refresh = getRefreshToken();

        if (refresh) {
          try {
            originalRequest._retry = true;
            refreshPromise =
              refreshPromise ||
              axios.post("/api/auth/token/refresh/", { refresh }).finally(() => {
                refreshPromise = null;
              });

            const refreshResponse = await refreshPromise;
            const nextAccess = refreshResponse.data?.access;

            if (nextAccess) {
              setSessionTokens({ access: nextAccess });
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${nextAccess}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            clearSession();

            if (window.location.pathname !== "/login") {
              window.location.assign("/login");
            }

            return Promise.reject(refreshError);
          }
        }
      }

      if (isUnauthorized) {
        clearSession();

        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }

      return Promise.reject(error);
    },
  );
}
