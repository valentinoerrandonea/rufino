"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ConceptSummary } from "@/lib/concepts";

function relTimeLong(iso: string | null): string {
  if (!iso) return "sin actividad";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const target = dateOnly
    ? (() => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return "hace 1 semana";
  if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
  if (days < 60) return "hace 1 mes";
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return `hace ${years} año${years > 1 ? "s" : ""}`;
}

export function ConceptsList({ concepts }: { concepts: ConceptSummary[] }) {
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concepts;
    return concepts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.toLowerCase().includes(q)) ||
        c.definition.toLowerCase().includes(q),
    );
  }, [concepts, query]);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <Eyebrow>Memoria</Eyebrow>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          Conceptos
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ink-2)",
            marginTop: 10,
            maxWidth: 580,
            lineHeight: 1.5,
          }}
        >
          {concepts.length} conceptos detectados a través de tus notas. Se promueven a
          página cuando 3+ notas distintas comparten un tag{" "}
          <span className="mono" style={{ fontSize: 12 }}>
            concepto/x
          </span>
          .
        </p>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conceptos…"
            className="input"
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>
      </div>

      {concepts.length === 0 ? (
        <EmptyDashed>
          Todavía no hay conceptos detectados. Aparecen automáticamente cuando 3+ notas distintas comparten un tag <span className="mono" style={{ fontSize: 11.5 }}>concepto/x</span>.
        </EmptyDashed>
      ) : filtered.length === 0 ? (
        <EmptyDashed>Nada coincide con &quot;{query}&quot;.</EmptyDashed>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {filtered.map((c, i) => {
            const hovered = hoveredId === c.id;
            return (
              <Link
                key={c.id}
                href={`/memory/concepto/${c.id}`}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  columnGap: 28,
                  alignItems: "center",
                  padding: "16px 22px",
                  borderBottom:
                    i < filtered.length - 1
                      ? "1px solid var(--hair-soft)"
                      : "none",
                  background: hovered ? "var(--surface-2)" : "transparent",
                  transition: "background 0.12s",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="serif"
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: "var(--ink)",
                        lineHeight: 1.25,
                      }}
                    >
                      {c.name}
                    </span>
                    {c.aliases.length > 0 && (
                      <span
                        className="serif"
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink-3)",
                          fontStyle: "italic",
                        }}
                      >
                        {c.aliases.join(" · ")}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      marginTop: 4,
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      maxWidth: 580,
                    }}
                  >
                    {c.definition}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-2)",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 90,
                    textAlign: "right",
                  }}
                >
                  <span
                    className="serif"
                    style={{ fontSize: 16, color: "var(--ink)" }}
                  >
                    {c.mentionsCount}
                  </span>
                  <span style={{ color: "var(--ink-3)", marginLeft: 4 }}>
                    menciones
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    whiteSpace: "nowrap",
                    minWidth: 100,
                    textAlign: "right",
                  }}
                >
                  {relTimeLong(c.lastSeen)}
                </div>

                <div
                  style={{
                    width: 18,
                    color: "var(--ink-3)",
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? "translateX(0)" : "translateX(-4px)",
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 0.6,
        fontWeight: 600,
        color: "var(--accent)",
        textTransform: "uppercase",
        marginBottom: 6,
        fontFamily: "var(--font-mono)",
      }}
    >
      {children}
    </div>
  );
}

function EmptyDashed({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px dashed var(--hair)",
        borderRadius: 8,
        padding: "18px 22px",
        color: "var(--ink-3)",
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--ink-3)",
        pointerEvents: "none",
      }}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
