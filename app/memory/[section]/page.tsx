import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { VAULT_PATH } from "@/lib/vault";
import { listProjects } from "@/lib/projects";
import { MemoryMarkdown } from "@/components/memory-markdown";
import { FileEditor, EditButton } from "@/components/file-editor";
import { ProjectsList } from "@/components/projects-list";

export const dynamic = "force-dynamic";

const SECTIONS: Record<string, { file: string; title: string }> = {
  perfil: { file: "perfil.md", title: "Perfil" },
  preferencias: { file: "preferencias.md", title: "Preferencias" },
  stack: { file: "stack.md", title: "Stack" },
  proyectos: { file: "", title: "Proyectos" },
};

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
    const projects = await listProjects();
    return <ProjectsList projects={projects} hrefBase="/memory/proyecto/" />;
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
