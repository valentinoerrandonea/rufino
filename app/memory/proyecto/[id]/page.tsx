import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { VAULT_PATH } from "@/lib/vault";
import { readProjectOverview, type EntryPreview } from "@/lib/projects";
import { connectionsFor } from "@/lib/triples";
import { MemoryMarkdown } from "@/components/memory-markdown";
import { AvatarStack } from "@/components/avatar-stack";
import { ConexionesSection } from "@/components/conexiones-section";
import { DeleteButton } from "@/components/delete-button";
import { fmtDate } from "@/components/atoms";

export const dynamic = "force-dynamic";

function relTimeLong(iso: string | null): string {
  if (!iso) return "sin actividad";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const target = dateOnly
    ? (() => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return "hace 1 semana";
  if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
  if (days < 60) return "hace 1 mes";
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return `hace ${years} año${years > 1 ? "s" : ""}`;
}

async function readSafe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

interface SessionFile {
  filename: string;
  title: string;
  date: string;
  content: string;
}

async function readSessionsForProject(projectId: string): Promise<SessionFile[]> {
  const dir = path.join(VAULT_PATH, "sesiones");
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const results: SessionFile[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const raw = await readSafe(path.join(dir, e.name));
    if (!raw) continue;
    const { data, content } = matter(raw);
    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    if (!tags.includes(`proyecto/${projectId}`)) continue;
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(e.name, ".md");
    results.push({
      filename: e.name,
      title,
      date: String(data.created || ""),
      content,
    });
  }
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export default async function ProyectoMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await readProjectOverview(id);
  if (!project) notFound();

  const sessions = await readSessionsForProject(id);
  const connections = await connectionsFor(id);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 880, margin: "0 auto" }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Link
          href="/memory/proyectos"
          className="btn ghost sm"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            marginLeft: -8,
          }}
        >
          ← Proyectos
        </Link>
        <DeleteButton
          relativePath={`proyectos/${id}`}
          itemLabel={`el proyecto ${project.name}`}
          redirectTo="/memory/proyectos"
          revalidate={["/memory/proyectos", "/"]}
        />
      </div>

      <header
        style={{
          marginBottom: 28,
          paddingBottom: 22,
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent)",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Memoria · Proyecto
        </div>
        <h1
          className="serif"
          style={{ fontSize: 36, fontWeight: 400, lineHeight: 1.1, marginBottom: 6 }}
        >
          {project.name}
        </h1>
        {project.subtitle && (
          <p
            style={{
              fontSize: 16,
              color: "var(--ink-2)",
              margin: 0,
              fontStyle: "italic",
              fontFamily: "var(--font-serif), Georgia, serif",
            }}
          >
            {project.subtitle}
          </p>
        )}
        {project.blurb && (
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-2)",
              marginTop: 14,
              lineHeight: 1.55,
              maxWidth: 640,
            }}
          >
            {project.blurb}
          </p>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 18,
            fontSize: 12,
            color: "var(--ink-3)",
            flexWrap: "wrap",
          }}
        >
          {project.peopleInitials.length > 0 && (
            <>
              <AvatarStack people={project.peopleInitials} size={22} max={4} />
              <span style={{ color: "var(--hair)" }}>·</span>
            </>
          )}
          <span>último movimiento {relTimeLong(project.lastActivity)}</span>
          {project.pendientesCount > 0 && (
            <>
              <span style={{ color: "var(--hair)" }}>·</span>
              <span>
                {project.pendientesCount} pendiente
                {project.pendientesCount === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      </header>

      <ConexionesSection
        outgoing={connections.outgoing}
        incoming={connections.incoming}
        unresolvedOut={connections.unresolvedOut}
      />

      <EntrySection
        title="Decisiones"
        emptyText="Todavía no hay decisiones registradas en este proyecto."
        entries={project.decisionEntries}
        bodyStyle={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}
      />

      <EntrySection
        title="Aprendizajes"
        emptyText="Todavía no hay aprendizajes registrados."
        entries={project.lessonEntries}
        bodyStyle={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 15,
          fontStyle: "italic",
          lineHeight: 1.55,
          color: "var(--ink)",
        }}
        wrapText={(t) => `“${t}”`}
        marginTop={36}
      />

      {sessions.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2
            className="serif"
            style={{
              fontSize: 22,
              fontWeight: 500,
              marginBottom: 14,
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            Sesiones
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                fontFamily: "var(--font-sans)",
                fontWeight: 400,
              }}
            >
              {sessions.length}
            </span>
          </h2>
          <div
            style={{
              border: "1px solid var(--hair)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {sessions.map((s, i) => (
              <details
                key={s.filename}
                style={{
                  borderBottom:
                    i < sessions.length - 1
                      ? "1px solid var(--hair-soft)"
                      : "none",
                }}
              >
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "14px 22px",
                    cursor: "pointer",
                    listStyle: "none",
                    background: "var(--surface)",
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--ink)",
                      lineHeight: 1.3,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {s.title}
                  </span>
                  {s.date && (
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", flexShrink: 0 }}>
                      {fmtDate(s.date)}
                    </span>
                  )}
                </summary>
                <div
                  style={{
                    padding: "18px 22px 22px",
                    background: "var(--bg)",
                    borderTop: "1px solid var(--hair-soft)",
                  }}
                >
                  <MemoryMarkdown content={s.content} stripTitle />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {project.overviewContent && (
        <details style={{ marginTop: 40 }}>
          <summary
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              cursor: "pointer",
              listStyle: "none",
              userSelect: "none",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontWeight: 600,
              padding: "8px 0",
            }}
          >
            Overview completo
          </summary>
          <div style={{ marginTop: 14 }}>
            <MemoryMarkdown content={project.overviewContent} stripTitle />
          </div>
        </details>
      )}
    </div>
  );
}

interface EntrySectionProps {
  title: string;
  emptyText: string;
  entries: EntryPreview[];
  bodyStyle: React.CSSProperties;
  wrapText?: (t: string) => string;
  marginTop?: number;
}

function EntrySection({
  title,
  emptyText,
  entries,
  bodyStyle,
  wrapText,
  marginTop,
}: EntrySectionProps) {
  return (
    <section style={{ marginBottom: 36, marginTop }}>
      <h2
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 500,
          marginBottom: 14,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        {title}
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
          }}
        >
          {entries.length}
        </span>
      </h2>
      {entries.length === 0 ? (
        <div
          style={{
            padding: "18px 22px",
            border: "1px dashed var(--hair)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--ink-3)",
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {entries.map((e, i) => (
            <div
              key={e.id}
              style={{
                padding: "16px 22px",
                borderBottom:
                  i < entries.length - 1
                    ? "1px solid var(--hair-soft)"
                    : "none",
              }}
            >
              <div style={bodyStyle}>{wrapText ? wrapText(e.title) : e.title}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  marginTop: 6,
                }}
              >
                {relTimeLong(e.when)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
