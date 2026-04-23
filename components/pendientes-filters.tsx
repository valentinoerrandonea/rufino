"use client";

import { useState, useMemo } from "react";
import type { Todo } from "@/lib/vault";
import { Tag, deadlineStatus } from "@/components/atoms";
import { TodoCheckbox } from "@/components/todo-checkbox";

type EstadoFilter = "todos" | "por hacer" | "en progreso" | "completados";
type DeadlineFilter = "todos" | "vencidos" | "hoy" | "esta semana" | "sin deadline";

interface PendientesWithSection extends Todo {
  section: "porHacer" | "enProgreso" | "completados";
}

interface PendientesFiltersProps {
  porHacer: Todo[];
  enProgreso: Todo[];
  completados: Todo[];
}

function getDeadlineCategory(todo: Todo): DeadlineFilter {
  if (!todo.deadline) return "sin deadline";
  const d = new Date(todo.deadline);
  if (isNaN(d.getTime())) return "sin deadline";
  const now = new Date();
  const todayISO = now.toISOString().split("T")[0];
  const daysUntil = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (todo.deadline < todayISO) return "vencidos";
  if (todo.deadline === todayISO) return "hoy";
  if (daysUntil <= 7) return "esta semana";
  return "todos";
}

export function PendientesFilters({ porHacer, enProgreso, completados }: PendientesFiltersProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedProyecto, setSelectedProyecto] = useState("todos");
  const [selectedPersona, setSelectedPersona] = useState("todos");
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineFilter>("todos");
  const [selectedEstado, setSelectedEstado] = useState<EstadoFilter>("todos");

  const allTodos: PendientesWithSection[] = useMemo(() => [
    ...porHacer.map((t) => ({ ...t, section: "porHacer" as const })),
    ...enProgreso.map((t) => ({ ...t, section: "enProgreso" as const })),
    ...completados.map((t) => ({ ...t, section: "completados" as const })),
  ], [porHacer, enProgreso, completados]);

  // Derive unique projects and people from all todos
  const proyectos = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTodos) {
      if (t.projectArista && t.projectArista !== "-") set.add(t.projectArista);
    }
    return Array.from(set).sort();
  }, [allTodos]);

  const personas = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTodos) {
      for (const p of t.people) {
        if (p && p !== "-") set.add(p);
      }
    }
    return Array.from(set).sort();
  }, [allTodos]);

  const filtered = useMemo(() => {
    return allTodos.filter((t) => {
      // Estado filter
      if (selectedEstado !== "todos") {
        if (selectedEstado === "por hacer" && t.section !== "porHacer") return false;
        if (selectedEstado === "en progreso" && t.section !== "enProgreso") return false;
        if (selectedEstado === "completados" && t.section !== "completados") return false;
      }

      // Proyecto filter
      if (selectedProyecto !== "todos" && t.projectArista !== selectedProyecto) return false;

      // Persona filter
      if (selectedPersona !== "todos" && !t.people.includes(selectedPersona)) return false;

      // Deadline filter
      if (selectedDeadline !== "todos") {
        const cat = getDeadlineCategory(t);
        if (selectedDeadline === "sin deadline" && cat !== "sin deadline") return false;
        if (selectedDeadline === "vencidos" && cat !== "vencidos") return false;
        if (selectedDeadline === "hoy" && cat !== "hoy") return false;
        if (selectedDeadline === "esta semana" && cat !== "esta semana" && cat !== "hoy") return false;
      }

      // Text search
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        if (
          !t.desc.toLowerCase().includes(q) &&
          !t.projectArista.toLowerCase().includes(q) &&
          !t.origin.toLowerCase().includes(q) &&
          !t.people.some((p) => p.toLowerCase().includes(q))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allTodos, selectedEstado, selectedProyecto, selectedPersona, selectedDeadline, searchText]);

  const filteredPorHacer = filtered.filter((t) => t.section === "porHacer");
  const filteredEnProgreso = filtered.filter((t) => t.section === "enProgreso");
  const filteredCompletados = filtered.filter((t) => t.section === "completados");

  const hasActiveFilters =
    selectedEstado !== "todos" ||
    selectedProyecto !== "todos" ||
    selectedPersona !== "todos" ||
    selectedDeadline !== "todos" ||
    searchText.trim() !== "";

  function resetFilters() {
    setSearchText("");
    setSelectedProyecto("todos");
    setSelectedPersona("todos");
    setSelectedDeadline("todos");
    setSelectedEstado("todos");
  }

  return (
    <div>
      {/* Filters bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <input
          className="input"
          style={{ width: 200, padding: "5px 10px", fontSize: 13 }}
          placeholder="Buscar..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <FilterSelect
          value={selectedEstado}
          onChange={(v) => setSelectedEstado(v as EstadoFilter)}
          options={[
            { value: "todos", label: "Todos los estados" },
            { value: "por hacer", label: "Por hacer" },
            { value: "en progreso", label: "En progreso" },
            { value: "completados", label: "Completados" },
          ]}
        />

        <FilterSelect
          value={selectedDeadline}
          onChange={(v) => setSelectedDeadline(v as DeadlineFilter)}
          options={[
            { value: "todos", label: "Cualquier deadline" },
            { value: "vencidos", label: "Vencidos" },
            { value: "hoy", label: "Hoy" },
            { value: "esta semana", label: "Esta semana" },
            { value: "sin deadline", label: "Sin deadline" },
          ]}
        />

        <FilterSelect
          value={selectedProyecto}
          onChange={setSelectedProyecto}
          options={[
            { value: "todos", label: "Todos los proyectos" },
            ...proyectos.map((p) => ({ value: p, label: p })),
          ]}
        />

        <FilterSelect
          value={selectedPersona}
          onChange={setSelectedPersona}
          options={[
            { value: "todos", label: "Todas las personas" },
            ...personas.map((p) => ({ value: p, label: p })),
          ]}
        />

        {hasActiveFilters && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={resetFilters}
          >
            Limpiar filtros
          </button>
        )}

        <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: "auto" }}>
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Sections */}
      <FilteredSection
        title="Por hacer"
        todos={filteredPorHacer}
        dim={false}
      />
      {filteredEnProgreso.length > 0 && (
        <FilteredSection
          title="En progreso"
          todos={filteredEnProgreso}
          dim={false}
        />
      )}
      {filteredCompletados.length > 0 && (
        <FilteredSection
          title="Completados"
          todos={filteredCompletados}
          dim
        />
      )}

      {filtered.length === 0 && (
        <div
          className="card-soft"
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--ink-2)",
            fontSize: 13,
          }}
        >
          No hay pendientes con esos filtros.
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const isActive = value !== options[0]?.value;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        color: isActive ? "var(--accent)" : "var(--ink-2)",
        background: isActive ? "var(--accent-wash)" : "var(--surface-2)",
        border: "1px solid transparent",
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none",
        paddingRight: 24,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239a948c'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        backgroundSize: "8px 5px",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FilteredSection({
  title,
  todos,
  dim,
}: {
  title: string;
  todos: PendientesWithSection[];
  dim?: boolean;
}) {
  if (todos.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        className="serif"
        style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}
      >
        {title}
      </h2>
      <div className="card" style={{ overflow: "hidden" }}>
        {todos.map((t, i) => {
          const ds = deadlineStatus(t.deadline);
          const done = t.state === "done";
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 16px",
                borderBottom:
                  i < todos.length - 1 ? "1px solid var(--hair-soft)" : "none",
                opacity: dim || done ? 0.6 : 1,
              }}
            >
              <div style={{ paddingTop: 2 }}>
                <TodoCheckbox
                  origin={t.origin}
                  desc={t.desc}
                  currentState={t.state}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    color: done ? "var(--ink-3)" : "var(--ink)",
                    lineHeight: 1.4,
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {t.desc}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 4,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Tag>{t.projectArista}</Tag>
                  {t.people.length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {t.people.join(" ")}
                    </span>
                  )}
                  {t.origin && (
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      ← {t.origin}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: ds.color,
                  whiteSpace: "nowrap",
                  paddingTop: 2,
                }}
              >
                {done && t.completed ? `completado ${t.completed}` : ds.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
