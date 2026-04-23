import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RUFINO_PATH } from "@/lib/vault";
import { Section } from "@/components/atoms";

export const dynamic = "force-dynamic";

type PersonData = {
  id: string;
  name: string;
  rol?: string;
  relation?: string;
  bio?: string;
  projects: string[];
  menciones: Array<{ link: string; date?: string; context?: string }>;
  tags: string[];
};

async function readPerson(id: string): Promise<PersonData | null> {
  const filePath = path.join(RUFINO_PATH, "_people", `${id}.md`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    const h1Match = content.match(/^#\s+(.+)$/m);
    const name = h1Match ? h1Match[1].trim() : id;

    const rolMatch = content.match(/\*\*Rol\*\*:?\s*(.+)/);
    const rol = rolMatch ? rolMatch[1].trim() : undefined;

    const relationMatch = content.match(/\*\*Relación\*\*:?\s*(.+)/);
    const relation = relationMatch ? relationMatch[1].trim() : undefined;

    const contextMatch = content.match(/## Contexto\s*([\s\S]*?)(?=##|$)/);
    const bio = contextMatch ? contextMatch[1].trim() : undefined;

    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    const projects = tags
      .filter((t) => t.startsWith("proyecto/"))
      .map((t) => t.split("/")[1]);

    // Parse ## Menciones en notas section
    const mencionesSection = content.match(/## Menciones en notas\s*([\s\S]*?)(?=---\s*$|$)/);
    const menciones: Array<{ link: string; date?: string; context?: string }> = [];

    if (mencionesSection) {
      const lines = mencionesSection[1].split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("-")) continue;
        // Pattern: - [[note-id]] — YYYY-MM-DD — contexto: ...
        // or: - [[note-id]]
        const linkMatch = trimmed.match(/\[\[([^\]]+)\]\]/);
        if (!linkMatch) continue;
        // Handle wikilink aliases: [[id|display]] → use id
        const wikiPart = linkMatch[1];
        const link = wikiPart.includes("|") ? wikiPart.split("|")[0] : wikiPart;

        const dateMatch = trimmed.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : undefined;

        const contextMatch2 = trimmed.match(/contexto:\s*(.+)/);
        const context = contextMatch2 ? contextMatch2[1].trim() : undefined;

        menciones.push({ link, date, context });
      }
    }

    return { id, name, rol, relation, bio, projects, menciones, tags };
  } catch {
    return null;
  }
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const person = await readPerson(id);

  if (!person) notFound();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/people"
          className="btn ghost sm"
          style={{ textDecoration: "none", marginBottom: 20, display: "inline-flex" }}
        >
          ← Volver a personas
        </Link>
      </div>

      {/* Header */}
      <header style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div
            className="avatar"
            style={{
              width: 56,
              height: 56,
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, marginBottom: 6 }}>
              {person.name}
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {person.rol && (
                <span className="chip" style={{ fontSize: 12 }}>
                  {person.rol}
                </span>
              )}
              {person.relation && (
                <span
                  className="chip"
                  style={{ fontSize: 12, color: "var(--ink-3)" }}
                >
                  {person.relation}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bio / Contexto */}
      {person.bio && (
        <Section title="Contexto">
          <div className="card-soft" style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.7, margin: 0 }}>
              {person.bio}
            </p>
          </div>
        </Section>
      )}

      {/* Projects */}
      {person.projects.length > 0 && (
        <Section title="Proyectos">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {person.projects.map((proj) => (
              <Link
                key={proj}
                href={`/projects/${proj}`}
                className="chip"
                style={{
                  textDecoration: "none",
                  fontSize: 13,
                  padding: "5px 12px",
                  color: "var(--accent)",
                  background: "var(--accent-wash)",
                }}
              >
                {proj}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Menciones */}
      <Section
        title="Menciones en notas"
        action={
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {person.menciones.length}{" "}
            {person.menciones.length === 1 ? "mención" : "menciones"}
          </span>
        }
      >
        {person.menciones.length === 0 ? (
          <div
            className="card-soft"
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            Ninguna aún. Se autoactualiza al procesar notas.
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {person.menciones.map((m, i) => (
              <div
                key={`${m.link}-${i}`}
                style={{
                  padding: "12px 18px",
                  borderBottom:
                    i < person.menciones.length - 1
                      ? "1px solid var(--hair-soft)"
                      : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div>
                  <Link
                    href={`/notes/${m.link}`}
                    style={{
                      fontSize: 13.5,
                      color: "var(--accent)",
                      textDecoration: "none",
                      fontFamily: "var(--font-serif, Georgia, serif)",
                    }}
                  >
                    {m.link}
                  </Link>
                  {m.context && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--ink-2)",
                        lineHeight: 1.5,
                        margin: "4px 0 0",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {m.context}
                    </p>
                  )}
                </div>
                {m.date && (
                  <span style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    {m.date}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
