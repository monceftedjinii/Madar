const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const SESSION_STORAGE_KEYS = ["madar_navbar_cache"];
const AUTH_SESSION_CHANGED_EVENT = "auth-session-changed";

function clearSessionScopedData() {
  if (typeof window === "undefined") return;

  SESSION_STORAGE_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
  });
}

function notifySessionChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}

export function getAccessToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return "";

  const cleanToken = token.trim();
  if (!cleanToken || cleanToken === "undefined" || cleanToken === "null") {
    return "";
  }

  return cleanToken;
}

export function getRefreshToken() {
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!token) return "";

  const cleanToken = token.trim();
  if (!cleanToken || cleanToken === "undefined" || cleanToken === "null") {
    return "";
  }

  return cleanToken;
}

export function setSessionTokens({ access, refresh }) {
  clearSessionScopedData();

  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  notifySessionChanged();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  clearSessionScopedData();
  notifySessionChanged();
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export { AUTH_SESSION_CHANGED_EVENT };
