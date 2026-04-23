import Link from "next/link";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Proyectos
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {projects.length} en el vault
        </p>
      </header>

      {projects.length === 0 ? (
        <div
          className="card-soft"
          style={{ padding: 32, textAlign: "center", color: "var(--ink-2)" }}
        >
          No hay proyectos en el vault.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card hoverable"
              style={{ padding: 20, textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ marginBottom: 8 }}>
                <h2 className="serif" style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>
                  {p.name}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--accent)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {p.id}
                </span>
              </div>

              {p.description && (
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.6,
                    margin: "0 0 14px",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.description}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  paddingTop: 12,
                  borderTop: "1px solid var(--hair-soft)",
                }}
              >
                <Stat label="decisiones" value={p.decisionesCount} />
                <Stat label="aprendizajes" value={p.aprendizajesCount} />
                {p.notesCount > 0 && <Stat label="notas" value={p.notesCount} />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-serif, Georgia, serif)" }}>
        {value}
      </span>
      <span style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
    </div>
  );
}
