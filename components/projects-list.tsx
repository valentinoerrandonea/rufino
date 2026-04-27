"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvatarStack } from "./avatar-stack";
import type { ProjectSummary } from "@/lib/projects";

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

export function ProjectsList({
  projects,
  hrefBase = "/projects/",
}: {
  projects: ProjectSummary[];
  /** Prefix for project links (e.g. "/projects/" or "/memory/proyecto/"). */
  hrefBase?: string;
}) {
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.subtitle ?? "").toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q),
    );
  }, [projects, query]);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Memoria
        </div>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          Proyectos
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
          {projects.length} proyectos en el roster. Decisiones y aprendizajes acumulados.
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
          <svg
            width={14}
            height={14}
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
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyectos…"
            className="input"
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: 13,
          }}
        >
          {query.trim()
            ? `Nada coincide con "${query}".`
            : "No hay proyectos en el vault."}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {filtered.map((p, i) => {
            const hovered = hoveredId === p.id;
            const knowledge = p.decisionesCount + p.aprendizajesCount;
            return (
              <Link
                key={p.id}
                href={`${hrefBase}${p.id}`}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto",
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
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-serif), Georgia, serif",
                        fontSize: 17,
                        fontWeight: 500,
                        color: "var(--ink)",
                        lineHeight: 1.25,
                      }}
                    >
                      {p.name}
                    </span>
                    {p.subtitle && (
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--ink-3)",
                          lineHeight: 1.3,
                        }}
                      >
                        {p.subtitle}
                      </span>
                    )}
                  </div>
                  {p.blurb && (
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
                        maxWidth: 560,
                      }}
                    >
                      {p.blurb}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    minWidth: 70,
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <AvatarStack people={p.peopleInitials} size={22} max={3} />
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-2)",
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-serif), Georgia, serif",
                      fontSize: 16,
                      color:
                        knowledge > 0 ? "var(--ink)" : "var(--ink-3)",
                    }}
                  >
                    {p.decisionesCount}
                  </span>
                  <span style={{ color: "var(--ink-3)", marginLeft: 4 }}>
                    dec.
                  </span>
                  <span style={{ color: "var(--hair)", margin: "0 8px" }}>·</span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif), Georgia, serif",
                      fontSize: 16,
                      color:
                        knowledge > 0 ? "var(--ink)" : "var(--ink-3)",
                    }}
                  >
                    {p.aprendizajesCount}
                  </span>
                  <span style={{ color: "var(--ink-3)", marginLeft: 4 }}>
                    aprend.
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    whiteSpace: "nowrap",
                    minWidth: 90,
                    textAlign: "right",
                  }}
                >
                  {relTimeLong(p.lastActivity)}
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
