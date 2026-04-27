"use client";

import {
  startTransition as reactStartTransition,
  useMemo,
  useOptimistic,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { Todo } from "@/lib/vault";
import { deadlineStatus, fmtDate } from "@/components/atoms";
import {
  moveTodoProject,
  toggleTodoState,
  updateTodoFields,
} from "@/app/actions";

type SectionKey = "porHacer" | "completados";

interface DragPayload {
  origin: string;
  desc: string;
  section: SectionKey;
  fromProject: string;
}

const SIN_PROYECTO = "sin proyecto";

// When marking a todo as done, hold the optimistic ✓ + strikethrough on screen
// for this long before letting the row jump to the Completados section. Gives
// the user clear confirmation that the click registered.
const DONE_HOLD_MS = 2500;

// Browsers normalize dataTransfer types to lowercase; pick markers that survive that
// so drop targets can filter cross-section drags during dragover (only `types` is
// exposed at that stage; the JSON payload is only readable on drop).
const SECTION_MARKER: Record<SectionKey, string> = {
  porHacer: "rufino/por-hacer",
  completados: "rufino/completados",
};

type EstadoFilter = "todos" | "por hacer" | "completados";
type DeadlineFilter = "todos" | "vencidos" | "hoy" | "esta semana" | "sin deadline";

interface PendientesWithSection extends Todo {
  section: SectionKey;
}

interface PendientesFiltersProps {
  porHacer: Todo[];
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

type OptimisticAction =
  | {
      kind: "move";
      origin: string;
      desc: string;
      section: SectionKey;
      newProject: string;
    }
  | {
      kind: "edit";
      origin: string;
      desc: string;
      section: SectionKey;
      newDesc: string;
      newPeople: string[];
      newDeadline: string | null;
    }
  | {
      kind: "setState";
      origin: string;
      desc: string;
      section: SectionKey;
      newState: "todo" | "done";
    };

type TodosState = { porHacer: Todo[]; completados: Todo[] };

function applyOptimisticAction(state: TodosState, action: OptimisticAction): TodosState {
  const list = [...state[action.section]];
  const idx = list.findIndex(
    (t) => t.origin === action.origin && t.desc === action.desc
  );
  if (idx === -1) return state;
  if (action.kind === "move") {
    list[idx] = { ...list[idx], projectArista: action.newProject };
  } else if (action.kind === "edit") {
    list[idx] = {
      ...list[idx],
      desc: action.newDesc,
      people: action.newPeople,
      deadline: action.newDeadline,
    };
  } else {
    // setState: toggle the visual state in place. The row stays in its current
    // section during the transition; once the server action persists the move
    // and router.refresh() fires, fresh props will show the row in its new
    // section (Completados or Por hacer) and the optimistic state clears.
    list[idx] = { ...list[idx], state: action.newState };
  }
  return { ...state, [action.section]: list };
}

export function PendientesFilters({ porHacer, completados }: PendientesFiltersProps) {
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [selectedProyecto, setSelectedProyecto] = useState("todos");
  const [selectedPersona, setSelectedPersona] = useState("todos");
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineFilter>("todos");
  const [selectedEstado, setSelectedEstado] = useState<EstadoFilter>("todos");

  // Optimistic source-of-truth: drag-and-drop moves, inline field edits, and
  // checkbox toggles apply instantly here while the server action persists
  // the change in `_pendientes.md`. useOptimistic auto-reverts on failure
  // when the transition closes without the underlying props having updated.
  const [optimistic, dispatch] = useOptimistic<TodosState, OptimisticAction>(
    { porHacer, completados },
    applyOptimisticAction
  );

  // Single-row edit mode: clicking another row while one is open switches
  // focus rather than stacking two open forms.
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);

  const handleDrop = (payload: DragPayload, targetProject: string) => {
    if (targetProject === payload.fromProject) return;
    const persistProject = targetProject === SIN_PROYECTO ? "-" : targetProject;
    reactStartTransition(async () => {
      dispatch({
        kind: "move",
        origin: payload.origin,
        desc: payload.desc,
        section: payload.section,
        newProject: persistProject,
      });
      try {
        await moveTodoProject({
          origin: payload.origin,
          desc: payload.desc,
          newProjectArista: persistProject,
        });
        router.refresh();
      } catch {
        // useOptimistic auto-reverts when the transition resolves
      }
    });
  };

  const handleEditSave = (
    todo: PendientesWithSection,
    fields: { desc: string; people: string[]; deadline: string | null }
  ) => {
    setEditingTodoId(null);
    reactStartTransition(async () => {
      dispatch({
        kind: "edit",
        origin: todo.origin,
        desc: todo.desc,
        section: todo.section,
        newDesc: fields.desc,
        newPeople: fields.people,
        newDeadline: fields.deadline,
      });
      try {
        await updateTodoFields({
          origin: todo.origin,
          desc: todo.desc,
          newDesc: fields.desc,
          newPeople: fields.people.length ? fields.people.join(" ") : "-",
          newDeadline:
            todo.section === "completados" ? undefined : fields.deadline ?? "-",
        });
        router.refresh();
      } catch {
        // optimistic auto-reverts
      }
    });
  };

  const handleToggleState = (
    todo: PendientesWithSection,
    nextState: "todo" | "done"
  ) => {
    reactStartTransition(async () => {
      dispatch({
        kind: "setState",
        origin: todo.origin,
        desc: todo.desc,
        section: todo.section,
        newState: nextState,
      });
      try {
        await toggleTodoState({
          origin: todo.origin,
          desc: todo.desc,
          currentState: todo.state,
          nextState,
        });
        // Hold the optimistic ✓ + strikethrough on screen for ~2.5s when
        // marking done, so the user sees confirmation before the row jumps
        // to the Completados section. Un-marking refreshes immediately.
        if (nextState === "done") {
          await new Promise((r) => setTimeout(r, DONE_HOLD_MS));
        }
        router.refresh();
      } catch {
        // optimistic auto-reverts when the transition resolves
      }
    });
  };

  const allTodos: PendientesWithSection[] = useMemo(() => [
    ...optimistic.porHacer.map((t) => ({ ...t, section: "porHacer" as const })),
    ...optimistic.completados.map((t) => ({ ...t, section: "completados" as const })),
  ], [optimistic]);

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

        <EstadoChips
          value={selectedEstado}
          onChange={setSelectedEstado}
          counts={{
            todos: allTodos.length,
            "por hacer": optimistic.porHacer.length,
            completados: optimistic.completados.length,
          }}
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

      {/* Active sections — grouped by project, ordered by created ASC */}
      <GroupedSection
        title="Por hacer"
        todos={filteredPorHacer}
        sortKey="created"
        sortDir="asc"
        section="porHacer"
        onDrop={handleDrop}
        editingTodoId={editingTodoId}
        onStartEdit={setEditingTodoId}
        onCancelEdit={() => setEditingTodoId(null)}
        onSaveEdit={handleEditSave}
        onToggleState={handleToggleState}
      />
      {filteredCompletados.length > 0 && (
        <DoneSection
          todos={filteredCompletados}
          onDrop={handleDrop}
          editingTodoId={editingTodoId}
          onStartEdit={setEditingTodoId}
          onCancelEdit={() => setEditingTodoId(null)}
          onSaveEdit={handleEditSave}
          onToggleState={handleToggleState}
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

function EstadoChips({
  value,
  onChange,
  counts,
}: {
  value: EstadoFilter;
  onChange: (v: EstadoFilter) => void;
  counts: Record<EstadoFilter, number>;
}) {
  const options: { value: EstadoFilter; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "por hacer", label: "Por hacer" },
    { value: "completados", label: "Completados" },
  ];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              background: active ? "var(--accent-wash)" : "transparent",
              border: `1px solid ${active ? "var(--accent)" : "var(--hair)"}`,
              color: active ? "var(--accent)" : "var(--ink-2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{opt.label}</span>
            <span
              style={{
                fontSize: 11,
                color: active ? "var(--accent)" : "var(--ink-3)",
                opacity: 0.8,
              }}
            >
              {counts[opt.value]}
            </span>
          </button>
        );
      })}
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

function groupByProject(todos: PendientesWithSection[]): Map<string, PendientesWithSection[]> {
  const map = new Map<string, PendientesWithSection[]>();
  for (const t of todos) {
    const key = t.projectArista && t.projectArista !== "-" ? t.projectArista : "sin proyecto";
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return map;
}

interface EditHandlers {
  editingTodoId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (
    todo: PendientesWithSection,
    fields: { desc: string; people: string[]; deadline: string | null }
  ) => void;
  onToggleState: (
    todo: PendientesWithSection,
    nextState: "todo" | "done"
  ) => void;
}

interface GroupedSectionProps extends EditHandlers {
  title: string;
  todos: PendientesWithSection[];
  sortKey: "created" | "completed";
  sortDir: "asc" | "desc";
  section: SectionKey;
  onDrop: (payload: DragPayload, targetProject: string) => void;
}

function GroupedSection({ title, todos, sortKey, sortDir, section, onDrop, ...edit }: GroupedSectionProps) {
  const groups = useMemo(() => {
    const byProject = groupByProject(todos);
    for (const list of byProject.values()) {
      list.sort((a, b) => {
        const aV = (a[sortKey] || "") as string;
        const bV = (b[sortKey] || "") as string;
        return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      });
    }
    return [...byProject.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [todos, sortKey, sortDir]);

  if (todos.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="serif" style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>
        {title}
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            fontWeight: 400,
            marginLeft: 8,
            fontFamily: "var(--font-sans)",
          }}
        >
          {todos.length}
        </span>
      </h2>

      {groups.map(([project, list]) => (
        <ProjectGroup
          key={project}
          project={project}
          todos={list}
          section={section}
          onDrop={onDrop}
          {...edit}
        />
      ))}
    </section>
  );
}

function DoneSection({
  todos,
  onDrop,
  ...edit
}: EditHandlers & {
  todos: PendientesWithSection[];
  onDrop: (payload: DragPayload, targetProject: string) => void;
}) {
  const [visible, setVisible] = useState(5);

  // Sort globally by completed DESC so the most recent finishes float to the top.
  const sorted = useMemo(
    () =>
      [...todos].sort((a, b) =>
        ((b.completed || "") as string).localeCompare((a.completed || "") as string)
      ),
    [todos]
  );

  const slice = sorted.slice(0, visible);
  const remaining = sorted.length - slice.length;

  // Group only the visible slice so pagination drives total cards on screen,
  // and within each group keep the same DESC-by-completed order.
  const groups = useMemo(() => {
    const byProject = groupByProject(slice);
    return [...byProject.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [slice]);

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="serif" style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>
        Completados
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            fontWeight: 400,
            marginLeft: 8,
            fontFamily: "var(--font-sans)",
          }}
        >
          {todos.length}
        </span>
      </h2>

      {groups.map(([project, list]) => (
        <ProjectGroup
          key={project}
          project={project}
          todos={list}
          section="completados"
          onDrop={onDrop}
          dim
          {...edit}
        />
      ))}

      {(remaining > 0 || visible > 5) && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {remaining > 0 && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setVisible((v) => v + 5)}
            >
              Ver {Math.min(remaining, 5)} más
            </button>
          )}
          {visible > 5 && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setVisible(5)}
            >
              Mostrar menos
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ProjectGroup({
  project,
  todos,
  section,
  onDrop,
  dim,
  ...edit
}: EditHandlers & {
  project: string;
  todos: PendientesWithSection[];
  section: SectionKey;
  onDrop: (payload: DragPayload, targetProject: string) => void;
  dim?: boolean;
}) {
  const [isOver, setIsOver] = useState(false);
  const [hasInvalidDrag, setHasInvalidDrag] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    // Reading dataTransfer.types is allowed during dragover; the payload itself
    // is only readable on drop. Use the section marker type below to filter.
    const sameSection = e.dataTransfer.types.includes(SECTION_MARKER[section]);
    if (!sameSection) {
      setHasInvalidDrag(true);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
    setHasInvalidDrag(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    setHasInvalidDrag(false);
    const raw = e.dataTransfer.getData("application/x-rufino-todo");
    if (!raw) return;
    try {
      const payload: DragPayload = JSON.parse(raw);
      if (payload.section !== section) return;
      onDrop(payload, project);
    } catch {
      // malformed drag payload, ignore
    }
  };

  const outline = isOver
    ? "2px dashed var(--accent)"
    : hasInvalidDrag
      ? "1px dashed var(--ink-3)"
      : "none";

  return (
    <div
      style={{ marginBottom: 18 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.6,
          fontWeight: 600,
          color: "var(--accent)",
          textTransform: "uppercase",
          marginBottom: 6,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {project}
        <span
          style={{
            color: "var(--ink-3)",
            fontWeight: 400,
            marginLeft: 6,
            fontFamily: "var(--font-sans)",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {todos.length}
        </span>
      </div>
      <div
        className="card"
        style={{
          overflow: "hidden",
          outline,
          outlineOffset: 2,
          background: isOver ? "var(--accent-wash)" : undefined,
          transition: "outline-color 0.12s, background 0.12s",
        }}
      >
        {todos.map((t, i) => (
          <TodoRow
            key={t.id}
            todo={t}
            isLast={i === todos.length - 1}
            section={section}
            project={project}
            dim={dim}
            editing={edit.editingTodoId === t.id}
            onStartEdit={() => edit.onStartEdit(t.id)}
            onCancelEdit={edit.onCancelEdit}
            onSaveEdit={(fields) => edit.onSaveEdit(t, fields)}
            onToggleState={(next) => edit.onToggleState(t, next)}
          />
        ))}
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  isLast,
  section,
  project,
  dim,
  editing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleState,
}: {
  todo: PendientesWithSection;
  isLast: boolean;
  section: SectionKey;
  project: string;
  dim?: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (fields: { desc: string; people: string[]; deadline: string | null }) => void;
  onToggleState: (next: "todo" | "done") => void;
}) {
  const ds = deadlineStatus(todo.deadline);
  const done = todo.state === "done";
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const payload: DragPayload = {
      origin: todo.origin,
      desc: todo.desc,
      section,
      fromProject: project,
    };
    e.dataTransfer.setData("application/x-rufino-todo", JSON.stringify(payload));
    e.dataTransfer.setData(SECTION_MARKER[section], "1");
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  const borderBottom = isLast ? "none" : "1px solid var(--hair-soft)";

  if (editing) {
    return (
      <div style={{ borderBottom, background: "var(--accent-wash)" }}>
        <TodoEditForm
          todo={todo}
          section={section}
          onCancel={onCancelEdit}
          onSave={onSaveEdit}
        />
      </div>
    );
  }

  // Click on the row body (not the checkbox) enters edit mode. Drag still works
  // because dragstart fires before click and click is suppressed if drag occurs.
  const handleBodyClick = () => {
    if (isDragging) return;
    onStartEdit();
  };

  return (
    <div
      draggable={!editing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        borderBottom,
        opacity: isDragging ? 0.4 : dim || done ? 0.6 : 1,
        cursor: "grab",
      }}
    >
      <div style={{ paddingTop: 2 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleState(todo.state === "todo" ? "done" : "todo");
          }}
          title={`Marcar como ${todo.state === "todo" ? "done" : "todo"}`}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
          }}
        >
          <div className={done ? "cb done" : "cb"}>
            <span className="cb-mark">{done ? "✓" : ""}</span>
          </div>
        </button>
      </div>
      <div
        style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
        onClick={handleBodyClick}
      >
        <div
          style={{
            fontSize: 13.5,
            color: done ? "var(--ink-3)" : "var(--ink)",
            lineHeight: 1.4,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {todo.desc}
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
          {todo.people.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              {todo.people.join(" ")}
            </span>
          )}
          {todo.origin && (
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              ← {todo.origin}
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
        onClick={handleBodyClick}
      >
        {done && todo.completed ? `completado ${fmtDate(todo.completed)}` : ds.label}
      </div>
    </div>
  );
}

function TodoEditForm({
  todo,
  section,
  onCancel,
  onSave,
}: {
  todo: PendientesWithSection;
  section: SectionKey;
  onCancel: () => void;
  onSave: (fields: { desc: string; people: string[]; deadline: string | null }) => void;
}) {
  const [desc, setDesc] = useState(todo.desc);
  const [peopleStr, setPeopleStr] = useState(todo.people.join(" "));
  const [deadline, setDeadline] = useState(todo.deadline ?? "");

  const isCompletados = section === "completados";
  const trimmedDesc = desc.trim();
  const dirty =
    trimmedDesc !== todo.desc ||
    peopleStr.trim() !== todo.people.join(" ") ||
    (!isCompletados && (deadline || "") !== (todo.deadline ?? ""));

  const handleSave = () => {
    if (!trimmedDesc) return;
    const peopleList = peopleStr
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => s && s !== "-");
    onSave({
      desc: trimmedDesc,
      people: peopleList,
      deadline: isCompletados ? todo.deadline : deadline.trim() || null,
    });
  };

  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        autoFocus
        rows={2}
        style={{
          width: "100%",
          fontSize: 13.5,
          lineHeight: 1.5,
          padding: "8px 10px",
          fontFamily: "var(--font-sans)",
          border: "1px solid var(--hair)",
          borderRadius: 6,
          background: "var(--surface)",
          color: "var(--ink)",
          resize: "vertical",
          boxSizing: "border-box",
        }}
        placeholder="Descripción"
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" }}>
          <span>personas</span>
          <input
            type="text"
            value={peopleStr}
            onChange={(e) => setPeopleStr(e.target.value)}
            placeholder="@gabi @diego"
            style={{
              fontSize: 12,
              padding: "5px 8px",
              border: "1px solid var(--hair)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--ink)",
              width: 180,
            }}
          />
        </label>
        {!isCompletados && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" }}>
            <span>deadline</span>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                fontSize: 12,
                padding: "5px 8px",
                border: "1px solid var(--hair)",
                borderRadius: 6,
                background: "var(--surface)",
                color: "var(--ink)",
              }}
            />
            {deadline && (
              <button
                type="button"
                onClick={() => setDeadline("")}
                title="Borrar deadline"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--ink-3)",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 2,
                }}
              >
                ×
              </button>
            )}
          </label>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button type="button" className="btn ghost sm" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={handleSave}
            disabled={!trimmedDesc || !dirty}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
