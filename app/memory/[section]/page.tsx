import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { VAULT_PATH } from "@/lib/vault";
import { MemoryMarkdown } from "@/components/memory-markdown";
import { FileEditor, EditButton } from "@/components/file-editor";

export const dynamic = "force-dynamic";

const SECTIONS: Record<string, { file: string; title: string }> = {
  perfil: { file: "perfil.md", title: "Perfil" },
  preferencias: { file: "preferencias.md", title: "Preferencias" },
  stack: { file: "stack.md", title: "Stack" },
  proyectos: { file: "", title: "Proyectos" },
};

interface ProjectCard {
  id: string;
  title: string;
  excerpt: string;
  decisionCount: number;
  aprendizajeCount: number;
  updated: string;
}

async function readProjectCards(): Promise<ProjectCard[]> {
  const dir = path.join(VAULT_PATH, "proyectos");
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const projects = entries.filter((e) => e.isDirectory());

  const cards: ProjectCard[] = [];

  for (const proj of projects) {
    const id = proj.name;
    const projectDir = path.join(dir, id);

    // overview
    let title = id;
    let excerpt = "";
    let updated = "";
    try {
      const raw = await fs.readFile(path.join(projectDir, "overview.md"), "utf-8");
      const { data, content } = matter(raw);
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) title = titleMatch[1].trim();
      updated = String(data.updated || data.created || "");
      // first non-heading, non-empty paragraph
      const lines = content.split("\n");
      for (const line of lines) {
        const l = line.trim();
        if (!l || l.startsWith("#") || l.startsWith("---")) continue;
        excerpt = l.slice(0, 160) + (l.length > 160 ? "…" : "");
        break;
      }
    } catch {
      // no overview
    }

    // count files
    const countFiles = async (subdir: string): Promise<number> => {
      const es = await fs.readdir(path.join(projectDir, subdir), { withFileTypes: true }).catch(() => []);
      return es.filter((e) => e.isFile() && e.name.endsWith(".md")).length;
    };
    const [decisionCount, aprendizajeCount] = await Promise.all([
      countFiles("decisiones"),
      countFiles("aprendizajes"),
    ]);

    cards.push({ id, title, excerpt, decisionCount, aprendizajeCount, updated });
  }

  return cards.sort((a, b) => b.updated.localeCompare(a.updated));
}

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = SECTIONS[section];
  if (!meta) notFound();

  // Proyectos list view
  if (section === "proyectos") {
    const cards = await readProjectCards();

    return (
      <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
          Memoria
        </div>
        <h1 className="serif" style={{ fontSize: 30, fontWeight: 400, margin: "0 0 6px", letterSpacing: -0.3 }}>
          Proyectos
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 0, marginBottom: 32, lineHeight: 1.6 }}>
          Overview, decisiones y aprendizajes por proyecto.
        </p>

        {cards.length === 0 && (
          <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Sin proyectos encontrados en el vault.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 14,
          }}
        >
          {cards.map((card) => (
            <a
              key={card.id}
              href={`/memory/proyecto/${card.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="card"
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  height: "100%",
                  boxSizing: "border-box",
                  transition: "border-color 0.12s",
                }}
              >
                <div className="serif" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.2, color: "var(--accent)" }}>
                  {card.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    paddingTop: 10,
                    borderTop: "1px solid var(--hair-soft)",
                    flexWrap: "wrap",
                    marginTop: "auto",
                  }}
                >
                  <span>{card.decisionCount} decisión{card.decisionCount !== 1 ? "es" : ""}</span>
                  <span>·</span>
                  <span>{card.aprendizajeCount} aprendizaje{card.aprendizajeCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Static doc view (perfil, preferencias, stack)
  const filepath = path.join(VAULT_PATH, meta.file);
  let content = "";
  let rawFile = "";
  let frontmatter: { created?: string; updated?: string; tags?: string[] } = {};

  try {
    rawFile = await fs.readFile(filepath, "utf-8");
    const parsed = matter(rawFile);
    content = parsed.content;
    const data = parsed.data as Record<string, unknown>;
    frontmatter = {
      created: data.created != null ? String(data.created) : undefined,
      updated: data.updated != null ? String(data.updated) : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    };
  } catch {
    // file not found — show empty state
  }

  const titleMatch = content.match(/^#\s+(.+)$/m);
  const pageTitle = titleMatch ? titleMatch[1].trim() : meta.title;

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      {rawFile ? (
        <FileEditor
          relativePath={meta.file}
          initialContent={rawFile}
          revalidate={[`/memory/${section}`]}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8 }}>
              Memoria
            </div>
            <EditButton />
          </div>
          <h1
            className="serif"
            style={{ fontSize: 30, fontWeight: 400, margin: "0 0 24px", letterSpacing: -0.3 }}
          >
            {pageTitle}
          </h1>
          <MemoryMarkdown content={content} meta={frontmatter} stripTitle />
        </FileEditor>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
            Memoria
          </div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 400, margin: "0 0 24px", letterSpacing: -0.3 }}>
            {pageTitle}
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-3)" }}>
            Archivo no encontrado: {meta.file}
          </p>
        </>
      )}
    </div>
  );
}
