import { useEffect, useState } from "react";

const STORAGE_KEY = "theme_dark_mode";

export default function useDarkModePreference() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, String(dark));
  }, [dark]);

  return [dark, setDark];
}
