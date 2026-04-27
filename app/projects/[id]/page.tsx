import Link from "next/link";
import { notFound } from "next/navigation";
import { readProjectOverview } from "@/lib/projects";
import { readTodos, readPeople } from "@/lib/vault";
import { Section, Tag, deadlineStatus } from "@/components/atoms";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

// Minimal inline markdown-to-JSX renderer (keeps under 100 lines)
function renderMarkdown(md: string): ReactNode {
  const lines = md.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { i++; continue; }

    // Headings
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) { nodes.push(<h3 key={i} className="serif" style={{ fontSize: 15, fontWeight: 500, marginTop: 18, marginBottom: 6 }}>{h3[1]}</h3>); i++; continue; }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) { nodes.push(<h2 key={i} className="serif" style={{ fontSize: 17, fontWeight: 500, marginTop: 24, marginBottom: 8 }}>{h2[1]}</h2>); i++; continue; }
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) { nodes.push(<h1 key={i} className="serif" style={{ fontSize: 21, fontWeight: 500, marginTop: 28, marginBottom: 10 }}>{h1[1]}</h1>); i++; continue; }

    // Bullet list — collect consecutive items
    if (line.match(/^[\s]*[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\s]*[-*]\s+/)) {
        items.push(lines[i].replace(/^[\s]*[-*]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: "6px 0 10px", paddingLeft: 20, listStyleType: "disc" }}>
          {items.map((item, j) => (
            <li key={j} style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 2 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={i} style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, margin: "0 0 10px" }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

function renderInline(text: string): ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*(.+)\*\*$/);
        return bold ? <strong key={i} style={{ fontWeight: 600, color: "var(--ink)" }}>{bold[1]}</strong> : <span key={i}>{part}</span>;
      })}
    </>
  );
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [project, { porHacer }, allPeople] = await Promise.all([
    readProjectOverview(id),
    readTodos(),
    readPeople(),
  ]);

  if (!project) notFound();

  const allTodos = porHacer;
  const projectTodos = allTodos.filter((t) =>
    t.projectArista.startsWith(`${id}/`) || t.projectArista === id
  );

  const involvedPeople = allPeople.filter((p) => p.projects.includes(id));

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/projects"
          className="btn ghost sm"
          style={{ textDecoration: "none", display: "inline-flex" }}
        >
          ← Volver a proyectos
        </Link>
      </div>

      {/* Header */}
      <header style={{ marginBottom: 36 }}>
        <span
          style={{
            fontSize: 11,
            color: "var(--accent)",
            fontFamily: "var(--font-mono, monospace)",
            display: "block",
            marginBottom: 8,
          }}
        >
          {id}
        </span>
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 400 }}>
          {project.name}
        </h1>
        {project.description && (
          <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.6 }}>
            {project.description}
          </p>
        )}
      </header>

      {/* Overview content */}
      <Section title="Overview">
        <div
          className="card-soft"
          style={{ padding: "20px 24px" }}
        >
          {renderMarkdown(project.overviewContent)}
        </div>
      </Section>

      {/* Personas */}
      {involvedPeople.length > 0 && (
        <Section title="Personas">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {involvedPeople.map((p) => (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="card hoverable"
                  style={{
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                      {p.name}
                    </div>
                    {p.rol && (
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.rol}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Decisiones and Aprendizajes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>
            Decisiones{" "}
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "inherit" }}>
              ({project.decisiones.length})
            </span>
          </h2>
          {project.decisiones.length === 0 ? (
            <div className="card-soft" style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink-3)" }}>
              Ninguna aún.
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {project.decisiones.map((d, i) => (
                <div
                  key={d}
                  style={{
                    padding: "10px 16px",
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    borderBottom: i < project.decisiones.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="serif" style={{ fontSize: 16, fontWeight: 500, marginBottom: 10 }}>
            Aprendizajes{" "}
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "inherit" }}>
              ({project.aprendizajes.length})
            </span>
          </h2>
          {project.aprendizajes.length === 0 ? (
            <div className="card-soft" style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink-3)" }}>
              Ninguno aún.
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {project.aprendizajes.map((a, i) => (
                <div
                  key={a}
                  style={{
                    padding: "10px 16px",
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    borderBottom: i < project.aprendizajes.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  }}
                >
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notas procesadas */}
      {project.noteIds.length > 0 && (
        <Section
          title="Notas procesadas"
          action={
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {project.noteIds.length} nota{project.noteIds.length !== 1 ? "s" : ""}
            </span>
          }
        >
          <div className="card" style={{ overflow: "hidden" }}>
            {project.noteIds.map((noteId, i) => (
              <Link
                key={noteId}
                href={`/notes/${noteId}`}
                className="hoverable"
                style={{
                  display: "block",
                  padding: "11px 18px",
                  fontSize: 13,
                  color: "var(--ink-2)",
                  textDecoration: "none",
                  borderBottom: i < project.noteIds.length - 1 ? "1px solid var(--hair-soft)" : "none",
                }}
              >
                {noteId}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Pendientes */}
      {projectTodos.length > 0 && (
        <Section
          title="Pendientes"
          action={
            <Link href="/pendientes" className="btn ghost sm" style={{ textDecoration: "none" }}>
              Ver todos →
            </Link>
          }
        >
          <div className="card" style={{ overflow: "hidden" }}>
            {projectTodos.map((t, i) => {
              const ds = deadlineStatus(t.deadline);
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 18px",
                    borderBottom: i < projectTodos.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  }}
                >
                  <div style={{ paddingTop: 3 }}>
                    <div className={`cb${t.state === "done" ? " done" : ""}`}>
                      <span className="cb-mark">{t.state === "done" ? "✓" : ""}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
                      {t.desc}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Tag>{t.projectArista}</Tag>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: ds.color, whiteSpace: "nowrap", paddingTop: 2 }}>
                    {ds.label}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
