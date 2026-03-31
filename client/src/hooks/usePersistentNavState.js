import { useEffect, useState } from "react";

const STORAGE_KEY = "madar_nav_open";

export default function usePersistentNavState() {
  const [isNavOpen, setIsNavOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(isNavOpen));
  }, [isNavOpen]);

  return [isNavOpen, setIsNavOpen];
}
