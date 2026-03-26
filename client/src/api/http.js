import axios from "axios";
import { clearSession, getAccessToken } from "../app/auth";

let configured = false;

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
    (error) => {
      if (error?.response?.status === 401) {
        clearSession();

        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }

      return Promise.reject(error);
    },
  );
}
