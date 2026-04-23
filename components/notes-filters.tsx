"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { relTime } from "@/components/atoms";

type NoteLite = {
  id: string;
  title: string;
  project: string;
  arista?: string;
  type: string;
  tags: string[];
  excerpt: string;
  created: string;
  processed?: string;
};

interface Props {
  notes: NoteLite[];
}

export function NotesFilters({ notes }: Props) {
  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [temaFilter, setTemaFilter] = useState<string | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string | null>(null);
  const [conceptoFilter, setConceptoFilter] = useState<string | null>(null);

  // Options derived from the full notes list (never filtered)
  const { projects, temas, personas, conceptos } = useMemo(() => {
    const pSet = new Set<string>();
    const tSet = new Set<string>();
    const perSet = new Set<string>();
    const cSet = new Set<string>();

    for (const n of notes) {
      pSet.add(n.project);
      for (const tag of n.tags) {
        if (tag.startsWith("tema/")) tSet.add(tag.slice(5));
        else if (tag.startsWith("persona/")) perSet.add(tag.slice(8));
        else if (tag.startsWith("concepto/")) cSet.add(tag.slice(9));
      }
    }

    return {
      projects: [...pSet].sort(),
      temas: [...tSet].sort(),
      personas: [...perSet].sort(),
      conceptos: [...cSet].sort(),
    };
  }, [notes]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return notes.filter((n) => {
      if (projectFilter && n.project !== projectFilter) return false;
      if (temaFilter && !n.tags.includes(`tema/${temaFilter}`)) return false;
      if (personaFilter && !n.tags.includes(`persona/${personaFilter}`)) return false;
      if (conceptoFilter && !n.tags.includes(`concepto/${conceptoFilter}`)) return false;
      if (qLower) {
        const hay =
          `${n.title} ${n.excerpt} ${n.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [notes, q, projectFilter, temaFilter, personaFilter, conceptoFilter]);

  // Group filtered notes by project
  const grouped = useMemo(() => {
    const byProject = new Map<string, NoteLite[]>();
    for (const n of filtered) {
      const list = byProject.get(n.project) || [];
      list.push(n);
      byProject.set(n.project, list);
    }
    // Sort projects alphabetically; 'general' last if present
    const keys = [...byProject.keys()].sort((a, b) => {
      if (a === "general") return 1;
      if (b === "general") return -1;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ project: k, notes: byProject.get(k)! }));
  }, [filtered]);

  const anyFilter =
    q !== "" ||
    projectFilter !== null ||
    temaFilter !== null ||
    personaFilter !== null ||
    conceptoFilter !== null;

  const clearFilters = () => {
    setQ("");
    setProjectFilter(null);
    setTemaFilter(null);
    setPersonaFilter(null);
    setConceptoFilter(null);
  };

  return (
    <div>
      {/* Filter bar — single line */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 18,
          flexWrap: "nowrap",
        }}
      >
        <input
          className="input"
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            padding: "5px 10px",
            height: 28,
          }}
        />
        <FilterSelect label="proyecto" value={projectFilter} options={projects} onChange={setProjectFilter} />
        <FilterSelect label="tema" value={temaFilter} options={temas} onChange={setTemaFilter} />
        <FilterSelect label="persona" value={personaFilter} options={personas} onChange={setPersonaFilter} />
        <FilterSelect label="concepto" value={conceptoFilter} options={conceptos} onChange={setConceptoFilter} />
        {anyFilter && (
          <button
            onClick={clearFilters}
            title="Limpiar filtros"
            style={{
              height: 28,
              padding: "0 8px",
              fontSize: 12,
              background: "transparent",
              border: "1px solid var(--hair)",
              borderRadius: 6,
              color: "var(--ink-2)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
        <span
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginLeft: 4,
          }}
        >
          {filtered.length}/{notes.length}
        </span>
      </div>

      {/* Grouped by project */}
      {grouped.length === 0 ? (
        <div
          className="card-soft"
          style={{ padding: 24, textAlign: "center", color: "var(--ink-2)", fontSize: 13 }}
        >
          No hay notas con esos filtros.
        </div>
      ) : (
        grouped.map(({ project, notes: projNotes }) => (
          <section key={project} style={{ marginBottom: 32 }}>
            <h2
              className="serif"
              style={{
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 10,
                display: "flex",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <span style={{ textTransform: "capitalize" }}>{project}</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-sans)", fontWeight: 400 }}>
                {projNotes.length}
              </span>
            </h2>
            <div className="card" style={{ overflow: "hidden" }}>
              {projNotes.map((n, i) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className="hoverable"
                  style={{
                    padding: "14px 18px",
                    borderBottom:
                      i < projNotes.length - 1 ? "1px solid var(--hair-soft)" : "none",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 16,
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
                        marginBottom: 4,
                      }}
                    >
                      <h3 className="serif" style={{ fontSize: 15, fontWeight: 500 }}>
                        {n.title}
                      </h3>
                      {n.arista && (
                        <span style={{ fontSize: 11, color: "var(--accent)" }}>
                          {n.arista}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{n.type}</span>
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-2)",
                        lineHeight: 1.5,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {n.excerpt}
                    </p>
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}
                  >
                    {relTime(n.processed || n.created)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{
        fontSize: 12,
        padding: "0 22px 0 8px",
        height: 28,
        border: "1px solid var(--hair)",
        borderRadius: 6,
        background: value ? "var(--accent-wash)" : "var(--surface)",
        color: value ? "var(--accent)" : "var(--ink-2)",
        cursor: "pointer",
        flexShrink: 0,
        maxWidth: 130,
        appearance: "none",
        WebkitAppearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path fill='%239a948c' d='M4 6L0 0h8z'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
