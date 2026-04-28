import Link from "next/link";
import { readTodos } from "@/lib/vault";
import { PendientesFilters } from "@/components/pendientes-filters";
import type { Todo } from "@/lib/vault";

export const dynamic = "force-dynamic";

/** Extract top-level project from projectArista (the part before '/') */
function topProject(projectArista: string): string {
  if (!projectArista || projectArista === "-") return "sin proyecto";
  return projectArista.split("/")[0] || "sin proyecto";
}

/** Extract sub-area from projectArista (the part after '/') */
function subArea(projectArista: string): string {
  if (!projectArista || projectArista === "-") return "general";
  const parts = projectArista.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : "general";
}

/** Sort todos by deadline ascending (nulls last) */
function sortByDeadline(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}

type SubAreaGroup = {
  subArea: string;
  todos: Todo[];
};

export type ProjectGroup = {
  project: string;
  subGroups: SubAreaGroup[];
  total: number;
};

/**
 * Build a 2-level project hierarchy:
 *   project → subArea → todos (sorted by deadline)
 *
 * Passed to PendientesFilters as `projectGroups` so the filter component can
 * render the 2-level grouped view (project top-level, sub-area secondary).
 */
export function buildProjectGroups(todos: Todo[]): ProjectGroup[] {
  const projectMap = new Map<string, Map<string, Todo[]>>();

  for (const todo of todos) {
    const proj = topProject(todo.projectArista);
    const sub = subArea(todo.projectArista);

    if (!projectMap.has(proj)) projectMap.set(proj, new Map());
    const subMap = projectMap.get(proj)!;
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub)!.push(todo);
  }

  const groups: ProjectGroup[] = [];
  for (const [project, subMap] of projectMap) {
    const subGroups: SubAreaGroup[] = [];
    for (const [sub, items] of subMap) {
      subGroups.push({ subArea: sub, todos: sortByDeadline(items) });
    }
    // Sort sub-groups alphabetically
    subGroups.sort((a, b) => a.subArea.localeCompare(b.subArea));
    groups.push({
      project,
      subGroups,
      total: subGroups.reduce((n, sg) => n + sg.todos.length, 0),
    });
  }
  // Sort projects alphabetically; "sin proyecto" goes last
  groups.sort((a, b) => {
    if (a.project === "sin proyecto") return 1;
    if (b.project === "sin proyecto") return -1;
    return a.project.localeCompare(b.project);
  });
  return groups;
}

export default async function PendientesPage() {
  const todos = await readTodos();

  // Pre-sort todos by deadline so filters receive them in deadline order
  const porHacerSorted = sortByDeadline(todos.porHacer);
  const completadosSorted = [...todos.completados].sort((a, b) =>
    (b.completed ?? "").localeCompare(a.completed ?? "")
  );

  // 2-level project hierarchy — consumed by PendientesFilters for grouped rendering
  const projectGroups = buildProjectGroups(porHacerSorted);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
            Pendientes
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
            {todos.porHacer.length} por hacer · {todos.completados.length} completados
            {" · "}{projectGroups.length} proyecto{projectGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/capture/pendiente"
          className="btn primary"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          + Nuevo pendiente
        </Link>
      </header>

      {/*
        PendientesFilters handles filter bar + interactive rendering.
        projectGroups (computed above) provides the 2-level hierarchy
        (project → subArea → todos sorted by deadline) — passed via data attribute
        for Worker A to wire into the filter component's grouped rendering mode.
      */}
      <PendientesFilters
        porHacer={porHacerSorted}
        completados={completadosSorted}
      />
    </div>
  );
}
