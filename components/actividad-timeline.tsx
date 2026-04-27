"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import type { LogEntry, LogOp } from "@/lib/log";

interface OpStyle {
  icon: string;
  color: string;
}

const OP_STYLES: Record<LogOp, OpStyle> = {
  ingest:    { icon: "⬇", color: "var(--ink-2)" },
  edit:      { icon: "✏", color: "var(--ink-2)" },
  delete:    { icon: "×", color: "var(--red)" },
  "lint-ok": { icon: "✓", color: "var(--green)" },
  "lint-warn": { icon: "!", color: "var(--amber)" },
  import:    { icon: "↘", color: "var(--ink-2)" },
  remember:  { icon: "✎", color: "var(--ink-2)" },
};

type FilterId = "todas" | "ingest" | "edit" | "delete" | "lint" | "import";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "todas",  label: "Todas" },
  { id: "ingest", label: "Ingest" },
  { id: "edit",   label: "Edición" },
  { id: "delete", label: "Borrado" },
  { id: "lint",   label: "Lint" },
  { id: "import", label: "Import" },
];

const DAY_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return DAY_FORMATTER.format(new Date(y, m - 1, d));
}

function navigableHref(slug: string): string | null {
  // notes
  if (/^rufino\//.test(slug)) {
    const m = slug.match(/([^/]+)\.md$/);
    if (m) return `/notes/${m[1]}`;
  }
  if (/^_people\//.test(slug) || /^rufino\/_people\//.test(slug)) {
    const m = slug.match(/([^/]+)\.md$/);
    if (m) return `/people/${m[1]}`;
  }
  if (/^proyectos\//.test(slug)) {
    const m = slug.match(/^proyectos\/([^/]+)/);
    if (m) return `/memory/proyecto/${m[1]}`;
  }
  if (slug === "perfil.md" || slug === "preferencias.md" || slug === "stack.md") {
    return `/memory/${slug.replace(".md", "")}`;
  }
  return null;
}

function matchOp(filter: FilterId, op: LogOp): boolean {
  if (filter === "todas") return true;
  if (filter === "lint") return op === "lint-ok" || op === "lint-warn";
  return filter === op;
}

export function ActividadTimeline({ entries }: { entries: LogEntry[] }) {
  const [filter, setFilter] = useState<FilterId>("todas");
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = entries.filter((e) => {
      if (!matchOp(filter, e.op)) return false;
      if (!q) return true;
      const haystack = `${e.slug} ${e.summary ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });

    const byDay = new Map<string, LogEntry[]>();
    for (const e of filtered) {
      const arr = byDay.get(e.date) ?? [];
      arr.push(e);
      byDay.set(e.date, arr);
    }
    return Array.from(byDay.entries()); // already sorted by entries' descending order
  }, [entries, filter, query]);

  const filteredCount = grouped.reduce((s, [, arr]) => s + arr.length, 0);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <Eyebrow>Rufino</Eyebrow>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          Actividad
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--ink-2)",
            marginTop: 8,
            maxWidth: 580,
            lineHeight: 1.55,
          }}
        >
          Lo que pasó en el vault — ingests, ediciones, sesiones de Claude, importaciones.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((c) => (
            <span
              key={c.id}
              className={`chip ${filter === c.id ? "active" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => setFilter(c.id)}
            >
              {c.label}
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative", width: 260 }}>
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input"
            placeholder="Filtrar por título o nota…"
            style={{ paddingLeft: 32, fontSize: 12.5 }}
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyDashed>
          Todavía no hay actividad registrada. Va a aparecer acá cuando proceses notas o edites algo.
        </EmptyDashed>
      ) : grouped.length === 0 ? (
        <EmptyDashed>Nada coincide con &quot;{query || filter}&quot;.</EmptyDashed>
      ) : (
        grouped.map(([date, arr]) => (
          <section key={date} style={{ marginBottom: 28 }}>
            <DaySticky>{dayLabel(date)}</DaySticky>
            <div>
              {arr.map((e, i) => (
                <EntryRow key={`${date}-${i}`} entry={e} />
              ))}
            </div>
          </section>
        ))
      )}

      <div
        style={{
          fontSize: 11,
          color: "var(--ink-3)",
          textAlign: "center",
          marginTop: 28,
        }}
      >
        Mostrando {filteredCount} de {entries.length} eventos · log completo en{" "}
        <span className="mono">vault/_meta/log.md</span>
      </div>
    </div>
  );
}

function EntryRow({ entry }: { entry: LogEntry }) {
  const style = OP_STYLES[entry.op] ?? { icon: "·", color: "var(--ink-3)" };
  const href = navigableHref(entry.slug);

  const inner = (
    <div
      className="hoverable"
      style={{
        display: "grid",
        gridTemplateColumns: "70px 22px 1fr",
        gap: 14,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderBottom: "1px solid var(--hair-soft)",
        borderRadius: 6,
      }}
    >
      <span
        className="mono"
        style={{ fontSize: 11, color: "var(--ink-3)", paddingTop: 2 }}
      >
        {entry.time}
      </span>
      <span
        style={{
          fontSize: 13,
          lineHeight: 1,
          color: style.color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 4,
          background: "var(--surface-2)",
        }}
      >
        {style.icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          className="serif"
          style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.4 }}
        >
          {humanTitle(entry)}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11.5,
            color: "var(--ink-3)",
            marginTop: 3,
            lineHeight: 1.45,
          }}
        >
          {entry.summary ? `${entry.slug} · ${entry.summary}` : entry.slug}
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function humanTitle(entry: LogEntry): string {
  const slugTail = entry.slug.split("/").pop()?.replace(/\.md$/, "") ?? entry.slug;
  switch (entry.op) {
    case "ingest":   return `Procesado · ${slugTail}`;
    case "edit":     return `Edición · ${slugTail}`;
    case "delete":   return `Borrado · ${slugTail}`;
    case "lint-ok":  return `Lint pass · ${slugTail}`;
    case "lint-warn":return `Lint pass · ${slugTail}`;
    case "import":   return `Import · ${slugTail}`;
    case "remember": return `Memoria · ${slugTail}`;
    default:         return slugTail;
  }
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

function DaySticky({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: "var(--bg)",
        padding: "10px 0 8px",
        fontFamily: "var(--font-serif), Georgia, serif",
        fontSize: 18,
        fontWeight: 400,
        color: "var(--ink-2)",
        borderBottom: "1px solid var(--hair-soft)",
        marginBottom: 6,
        textTransform: "capitalize",
      }}
    >
      {children}
    </div>
  );
}

function EmptyDashed({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        border: "1px dashed var(--hair)",
        borderRadius: 8,
        padding: "18px 22px",
        color: "var(--ink-3)",
        fontSize: 13,
        lineHeight: 1.55,
        ...style,
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
