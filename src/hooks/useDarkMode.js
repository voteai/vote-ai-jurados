import { useState, useEffect } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("juripro_dark") === "true"; } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("juripro_dark", String(dark)); } catch {}
  }, [dark]);

  return [dark, setDark];
}