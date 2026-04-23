"use client";

import { useState, useEffect } from "react";
import { useTheme } from "./theme-provider";

const ACCENT_OPTIONS = [
  { id: "terracota", label: "Terracota", primary: "#b06836", secondary: "#c4855a" },
  { id: "oliva",     label: "Oliva",     primary: "#6b7a4b", secondary: "#859460" },
  { id: "indigo",    label: "Indigo",    primary: "#5a6ea0", secondary: "#7285b8" },
  { id: "grafito",   label: "Grafito",   primary: "#4a4a4a", secondary: "#666666" },
] as const;

type AccentId = (typeof ACCENT_OPTIONS)[number]["id"];

const STORAGE_KEY = "rufino-accent";

function applyAccent(primary: string, secondary: string) {
  document.documentElement.style.setProperty("--accent", primary);
  document.documentElement.style.setProperty("--accent-2", secondary);
}

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
}

export function TweaksPanel({ open, onClose }: TweaksPanelProps) {
  const { theme, toggle } = useTheme();
  const [accent, setAccent] = useState<AccentId>("terracota");

  // Load persisted accent on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccentId | null;
    if (stored && ACCENT_OPTIONS.find((o) => o.id === stored)) {
      setAccent(stored);
      const opt = ACCENT_OPTIONS.find((o) => o.id === stored)!;
      applyAccent(opt.primary, opt.secondary);
    }
  }, []);

  const handleAccent = (id: AccentId) => {
    const opt = ACCENT_OPTIONS.find((o) => o.id === id)!;
    setAccent(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyAccent(opt.primary, opt.secondary);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 49,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          bottom: 64,
          right: 20,
          zIndex: 50,
          width: 240,
          background: "var(--bg-2)",
          border: "1px solid var(--hair)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Theme */}
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500, marginBottom: 10 }}>
            Tema
          </div>
          <button
            onClick={toggle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--hair)",
              color: "var(--ink)",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 15 }}>{theme === "light" ? "☾" : "☀"}</span>
            <span>{theme === "light" ? "Cambiar a oscuro" : "Cambiar a claro"}</span>
          </button>
        </div>

        {/* Accent */}
        <div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500, marginBottom: 10 }}>
            Color de acento
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ACCENT_OPTIONS.map((opt) => {
              const active = accent === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleAccent(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 7,
                    background: active ? "var(--surface)" : "transparent",
                    border: active ? `1.5px solid ${opt.primary}` : "1px solid var(--hair-soft)",
                    cursor: "pointer",
                    color: "var(--ink)",
                    fontSize: 12,
                    fontWeight: active ? 500 : 400,
                    transition: "all 0.12s",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: opt.primary,
                      flexShrink: 0,
                    }}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
