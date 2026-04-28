import Link from "next/link";
import { notFound } from "next/navigation";
import { readProjectOverview, type EntryPreview } from "@/lib/projects";
import { AvatarStack } from "@/components/avatar-stack";
import { DeleteButton } from "@/components/delete-button";
import { ProjectEditToggle } from "@/components/project-edit-form";

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

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await readProjectOverview(id);
  if (!project) notFound();

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
          href="/projects"
          className="btn ghost sm"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            marginLeft: -8,
          }}
        >
          ← Proyectos
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ProjectEditToggle
            projectId={id}
            initialName={project.name}
            initialDescription={project.blurb}
            initialTags={project.tags}
          />
          <DeleteButton
            relativePath={`proyectos/${id}`}
            itemLabel={`el proyecto ${project.name}`}
            redirectTo="/projects"
            revalidate={["/projects", "/"]}
          />
        </div>
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

      <EntrySection
        title="Decisiones"
        emptyText="Todavía no hay decisiones registradas en este proyecto."
        entries={project.decisionEntries}
        projectId={id}
        kind="decision"
        bodyStyle={{
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ink)",
        }}
      />

      <EntrySection
        title="Aprendizajes"
        emptyText="Todavía no hay aprendizajes registrados."
        entries={project.lessonEntries}
        projectId={id}
        kind="aprendizaje"
        bodyStyle={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 15,
          fontStyle: "italic",
          lineHeight: 1.55,
          color: "var(--ink)",
        }}
        wrapText={(t) => `"${t}"`}
        marginTop={36}
      />

      {project.noteIds.length > 0 && (
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
            Notas
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                fontFamily: "var(--font-sans)",
                fontWeight: 400,
              }}
            >
              {project.noteIds.length}
            </span>
          </h2>
          <div className="card" style={{ overflow: "hidden" }}>
            {project.noteIds.map((noteId, i) => (
              <Link
                key={noteId}
                href={`/notes/${noteId}`}
                className="hoverable"
                style={{
                  display: "block",
                  padding: "12px 22px",
                  fontSize: 13,
                  color: "var(--ink-2)",
                  textDecoration: "none",
                  borderBottom:
                    i < project.noteIds.length - 1
                      ? "1px solid var(--hair-soft)"
                      : "none",
                }}
              >
                {noteId}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface EntrySectionProps {
  title: string;
  emptyText: string;
  entries: EntryPreview[];
  projectId: string;
  kind: "decision" | "aprendizaje";
  bodyStyle: React.CSSProperties;
  wrapText?: (t: string) => string;
  marginTop?: number;
}

function EntrySection({
  title,
  emptyText,
  entries,
  projectId,
  kind,
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
            <Link
              key={e.id}
              href={`/projects/${projectId}/${kind}/${e.id}`}
              className="hoverable"
              style={{
                display: "block",
                padding: "16px 22px",
                borderBottom:
                  i < entries.length - 1
                    ? "1px solid var(--hair-soft)"
                    : "none",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={bodyStyle}>{wrapText ? wrapText(e.title) : e.title}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {relTimeLong(e.when)}
                <span style={{ color: "var(--accent)", fontSize: 10 }}>→ ver detalle</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
