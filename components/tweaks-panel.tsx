"use client";

import { useTheme } from "./theme-provider";

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
}

export function TweaksPanel({ open, onClose }: TweaksPanelProps) {
  const { theme, toggle } = useTheme();

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
      </div>
    </>
  );
}
