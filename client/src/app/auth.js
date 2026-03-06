export function isAuthenticated() {
  const token = localStorage.getItem("access_token");
  if (!token) return false;

  const cleanToken = token.trim();
  if (!cleanToken) return false;

  if (cleanToken === "undefined" || cleanToken === "null") return false;

  return true;
}

