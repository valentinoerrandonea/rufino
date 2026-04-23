import { readProcessedNotes, readTodos, readPeople, readRawNotes } from "@/lib/vault";
import { Section, StatCard, Tag, relTime, deadlineStatus } from "@/components/atoms";
import { TodoCheckbox } from "@/components/todo-checkbox";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [notes, todos, people, rawNotes] = await Promise.all([
    readProcessedNotes(),
    readTodos(),
    readPeople(),
    readRawNotes(),
  ]);

  const activeTodos = [...todos.porHacer, ...todos.enProgreso];
  const overdue = activeTodos.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return !isNaN(d.getTime()) && d < new Date();
  });
  const todayISO = new Date().toISOString().split("T")[0];
  const dueToday = activeTodos.filter((t) => t.deadline === todayISO);
  const dueSoon = activeTodos.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    if (isNaN(d.getTime())) return false;
    const days = Math.floor((d.getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  });

  // Show ALL active todos, sorted by: vencidos → con deadline (asc) → sin deadline
  const nowTs = Date.now();
  const rank = (t: (typeof activeTodos)[number]): number => {
    if (!t.deadline) return Number.MAX_SAFE_INTEGER;
    const d = new Date(t.deadline);
    if (isNaN(d.getTime())) return Number.MAX_SAFE_INTEGER;
    return d.getTime();
  };
  const priority = [...activeTodos].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    // Within same deadline bucket, por hacer before en progreso (progress is "later" in the workflow)
    if (a.state !== b.state) {
      if (a.state === "todo") return -1;
      if (b.state === "todo") return 1;
    }
    return 0;
  });
  // Mark overdue for styling (based on deadline < now)
  const isOverdue = (t: (typeof activeTodos)[number]) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return !isNaN(d.getTime()) && d.getTime() < nowTs;
  };

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

      <Section
        title="Para atender"
        action={
          <Link href="/pendientes" className="btn ghost sm" style={{ textDecoration: "none" }}>
            Ver todos →
          </Link>
        }
      >
        {priority.length === 0 ? (
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
          <div className="card" style={{ overflow: "hidden" }}>
            {priority.map((t, i) => {
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
                      i < priority.length - 1 ? "1px solid var(--hair-soft)" : "none",
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
                    <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>
                      {t.desc}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center" }}>
                      <Tag>{t.projectArista}</Tag>
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

      <Section title="Un vistazo">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
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
      </Section>
    </div>
  );
}
