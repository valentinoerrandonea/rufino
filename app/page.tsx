import { readProcessedNotes, readTodos, readPeople, readRawNotes } from "@/lib/vault";
import { listConcepts } from "@/lib/concepts";
import { readGraph } from "@/lib/triples";
import { Section, StatCard, relTime, deadlineStatus } from "@/components/atoms";
import { TodoCheckbox } from "@/components/todo-checkbox";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [notes, todos, people, rawNotes, concepts, graph] = await Promise.all([
    readProcessedNotes(),
    readTodos(),
    readPeople(),
    readRawNotes(),
    listConcepts(),
    readGraph(),
  ]);

  const activeTodos = todos.porHacer;
  const overdue = activeTodos.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return !isNaN(d.getTime()) && d < new Date();
  });
  const todayISO = new Date().toISOString().split("T")[0];
  const dueToday = activeTodos.filter((t) => t.deadline === todayISO);

  // Group active todos by projectArista. Within each group sort by deadline
  // ASC (earliest first; sin fecha al final). Sort groups by their most
  // urgent todo so the project with the closest deadline shows up first.
  const rank = (t: (typeof activeTodos)[number]): number => {
    if (!t.deadline) return Number.MAX_SAFE_INTEGER;
    const d = new Date(t.deadline);
    if (isNaN(d.getTime())) return Number.MAX_SAFE_INTEGER;
    return d.getTime();
  };

  const groupedActive = (() => {
    const byProject = new Map<string, typeof activeTodos>();
    for (const t of activeTodos) {
      const key = t.projectArista && t.projectArista !== "-" ? t.projectArista : "sin proyecto";
      const list = byProject.get(key) ?? [];
      list.push(t);
      byProject.set(key, list);
    }
    for (const list of byProject.values()) {
      list.sort((a, b) => rank(a) - rank(b));
    }
    return [...byProject.entries()].sort((a, b) => rank(a[1][0]) - rank(b[1][0]));
  })();

  const HOME_TODOS_PER_PROJECT = 3;

  const recentNotes = notes.slice(0, 4);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const projectCount = new Set(notes.map((n) => n.project)).size;

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 40 }}>
        <h1 className="serif" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}>
          {greet}, Val.
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.5 }}>
          {overdue.length > 0 ? (
            <>
              Tenés{" "}
              <span style={{ color: "var(--red)", fontWeight: 500 }}>
                {overdue.length} pendiente{overdue.length > 1 ? "s" : ""} vencido
                {overdue.length > 1 ? "s" : ""}
              </span>
              {dueToday.length > 0 && (
                <>
                  , y{" "}
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                    {dueToday.length} para hoy
                  </span>
                </>
              )}
              .
            </>
          ) : dueToday.length > 0 ? (
            <>
              Tenés{" "}
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                {dueToday.length} pendiente{dueToday.length > 1 ? "s" : ""} para hoy
              </span>
              .
            </>
          ) : (
            <>Nada vencido ni urgente para hoy.</>
          )}
          {rawNotes.length > 0 && (
            <>
              {" "}
              <span style={{ color: "var(--ink-2)" }}>
                · {rawNotes.length} nota{rawNotes.length > 1 ? "s" : ""} sin procesar
              </span>
            </>
          )}
        </p>
      </header>

      <div style={{ display: "flex", gap: 10, marginBottom: 44 }}>
        <Link href="/capture/nota" className="btn primary" style={{ textDecoration: "none" }}>
          + Nueva nota{" "}
          <kbd
            style={{
              marginLeft: 4,
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              borderColor: "transparent",
            }}
          >
            N
          </kbd>
        </Link>
        <Link href="/capture/pendiente" className="btn" style={{ textDecoration: "none" }}>
          + Pendiente <kbd style={{ marginLeft: 4 }}>T</kbd>
        </Link>
        <Link href="/capture/persona" className="btn" style={{ textDecoration: "none" }}>
          + Persona <kbd style={{ marginLeft: 4 }}>P</kbd>
        </Link>
      </div>

      <Section title="Un vistazo">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
          <StatCard label="Notas" value={notes.length} sub="procesadas" href="/notes" />
          <StatCard
            label="Pendientes"
            value={activeTodos.length}
            sub={`${overdue.length} vencidos`}
            href="/pendientes"
          />
          <StatCard label="Personas" value={people.length} sub="en el roster" href="/people" />
          <StatCard label="Proyectos" value={projectCount} sub="activos" />
        </div>

        {/* Conceptos — top 10 por menciones */}
        {concepts.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12, margin: "0 0 12px 0" }}>
              Conceptos
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {concepts.slice(0, 10).map((c) => (
                <span key={c.id} className="chip" style={{ cursor: "pointer" }}>
                  {c.name}
                  <span style={{ fontSize: 10, color: "var(--ink-dim)", marginLeft: 2 }}>
                    ({c.mentionsCount})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conexiones — overview del grafo */}
        {graph.nodes.length > 0 && (
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 12px 0" }}>
              Conexiones
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <div className="card" style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>Nodos en el grafo</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "var(--accent)" }}>
                  {graph.nodes.length}
                </div>
              </div>
              <div className="card" style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>Relaciones</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: "var(--accent)" }}>
                  {graph.edges.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Para atender">
        {groupedActive.length === 0 ? (
          <div
            className="card-soft"
            style={{
              padding: "24px 20px",
              textAlign: "center",
              color: "var(--ink-2)",
              fontSize: 13,
            }}
          >
            Todo al día. Disfrutá.
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 18,
              }}
            >
            {groupedActive.map(([project, list], idx) => {
              const visible = list.slice(0, HOME_TODOS_PER_PROJECT);
              const overflow = list.length - visible.length;
              const isLastOdd =
                idx === groupedActive.length - 1 && groupedActive.length % 2 === 1;
              return (
                <div key={project} style={isLastOdd ? { gridColumn: "1 / -1" } : undefined}>
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
                      {list.length}
                    </span>
                  </div>
                  <div className="card" style={{ overflow: "hidden" }}>
                    {visible.map((t, i) => {
                      const ds = deadlineStatus(t.deadline);
                      return (
                        <div
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: "12px 18px",
                            borderBottom:
                              i < visible.length - 1 ? "1px solid var(--hair-soft)" : "none",
                          }}
                        >
                          <div style={{ paddingTop: 2 }}>
                            <TodoCheckbox
                              origin={t.origin}
                              desc={t.desc}
                              currentState={t.state}
                              holdOnDone
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                color: t.state === "done" ? "var(--ink-3)" : "var(--ink)",
                                lineHeight: 1.4,
                                textDecoration: t.state === "done" ? "line-through" : "none",
                              }}
                            >
                              {t.desc}
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
                            {ds.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {overflow > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 6,
                        paddingLeft: 18,
                      }}
                    >
                      + {overflow} más en este proyecto
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <Link
                href="/pendientes"
                className="btn ghost sm"
                style={{ textDecoration: "none" }}
              >
                Ver todos los pendientes →
              </Link>
            </div>
          </>
        )}
      </Section>

      <Section
        title="Notas recientes"
        action={
          <Link href="/notes" className="btn ghost sm" style={{ textDecoration: "none" }}>
            Ver todas →
          </Link>
        }
      >
        {recentNotes.length === 0 ? (
          <div
            className="card-soft"
            style={{
              padding: "24px 20px",
              textAlign: "center",
              color: "var(--ink-2)",
              fontSize: 13,
            }}
          >
            Aún no hay notas procesadas.
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {recentNotes.map((n, i) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                className="hoverable"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  columnGap: 16,
                  alignItems: "baseline",
                  padding: "14px 18px",
                  borderBottom:
                    i < recentNotes.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}
                  >
                    <h3 className="serif" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>
                      {n.title}
                    </h3>
                    <span style={{ fontSize: 11, color: "var(--accent)" }}>
                      {n.project}
                      {n.arista ? ` · ${n.arista}` : ""}
                    </span>
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
                <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                  {relTime(n.processed || n.created)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

    </div>
  );
}
