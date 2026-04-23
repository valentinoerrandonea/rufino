import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RUFINO_PATH, VAULT_PATH } from "@/lib/vault";
import { MemoryMarkdown } from "@/components/memory-markdown";
import { FileEditor, EditButton } from "@/components/file-editor";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const filePath = path.join(RUFINO_PATH, "_people", `${id}.md`);

  let rawFile: string;
  try {
    rawFile = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  const { data, content } = matter(rawFile);
  const h1Match = content.match(/^#\s+(.+)$/m);
  const name = h1Match ? h1Match[1].trim() : id;

  const frontmatter = {
    created: data.created != null ? String(data.created) : undefined,
    updated: data.updated != null ? String(data.updated) : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
  };

  const personFilePath = path.join("rufino", "_people", `${id}.md`);

  return (
    <div style={{ padding: "48px 72px 80px", maxWidth: 960, margin: "0 auto" }}>
      <FileEditor
        relativePath={personFilePath}
        initialContent={rawFile}
        revalidate={[`/people/${id}`, "/people", "/"]}
      >
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Link
            href="/people"
            className="btn ghost sm"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            ← Volver a personas
          </Link>
          <EditButton />
        </div>

        {/* Header with avatar + name */}
        <header style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 18 }}>
          <div
            className="avatar"
            style={{
              width: 64,
              height: 64,
              fontSize: 26,
              flexShrink: 0,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}>
            {name}
          </h1>
        </header>

        {/* Full markdown content of the person file */}
        <MemoryMarkdown content={content} meta={frontmatter} stripTitle />
      </FileEditor>
    </div>
  );
}
