import { readTodos } from "@/lib/vault";
import { deadlineStatus, Tag } from "@/components/atoms";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const todos = await readTodos();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Pendientes
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {todos.porHacer.length} por hacer · {todos.enProgreso.length} en progreso ·{" "}
          {todos.completados.length} completados
        </p>
      </header>

      <TodoSection title="Por hacer" todos={todos.porHacer} />
      {todos.enProgreso.length > 0 && <TodoSection title="En progreso" todos={todos.enProgreso} />}
      {todos.completados.length > 0 && (
        <TodoSection title="Completados" todos={todos.completados} dim />
      )}
    </div>
  );
}

function TodoSection({
  title,
  todos,
  dim,
}: {
  title: string;
  todos: Awaited<ReturnType<typeof readTodos>>["porHacer"];
  dim?: boolean;
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="serif" style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
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
                borderBottom: i < todos.length - 1 ? "1px solid var(--hair-soft)" : "none",
                opacity: dim || done ? 0.6 : 1,
              }}
            >
              <div style={{ paddingTop: 2 }}>
                <div
                  className={`cb${done ? " done" : t.state === "progress" ? " progress" : ""}`}
                >
                  <span className="cb-mark">{done ? "✓" : t.state === "progress" ? "·" : ""}</span>
                </div>
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
                <div style={{ display: "flex", gap: 12, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <Tag>{t.projectArista}</Tag>
                  {t.people.length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {t.people.join(" ")}
                    </span>
                  )}
                  {t.origin && (
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>← {t.origin}</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: ds.color, whiteSpace: "nowrap", paddingTop: 2 }}>
                {done && t.completed ? `completado ${t.completed}` : ds.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
