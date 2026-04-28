"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy init reads localStorage once on mount (client only — Provider is
  // wrapped in "use client"). No setState-in-effect, just a sync DOM
  // side-effect to apply the data-theme attribute.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("rufino-theme") as Theme | null) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("rufino-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "light" ? "dark" : "light") }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
