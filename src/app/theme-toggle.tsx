"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      aria-label={theme === "light" ? "Dunkles Design aktivieren" : "Helles Design aktivieren"}
      className={`theme-toggle${floating ? " theme-toggle-floating" : ""}`}
      onClick={toggle}
      type="button"
    >
      {theme === "light" ? "🌙 Dunkel" : "☀️ Hell"}
    </button>
  );
}
