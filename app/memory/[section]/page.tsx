import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { VAULT_PATH } from "@/lib/vault";

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

  if (section === "proyectos") {
    const dir = path.join(VAULT_PATH, "proyectos");
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const projects = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    return (
      <div style={{ padding: "48px 56px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, marginBottom: 24 }}>
          Proyectos
        </h1>
        <div className="card" style={{ overflow: "hidden" }}>
          {projects.map((p, i) => (
            <a
              key={p}
              href={`/memory/proyecto/${p}`}
              className="hoverable"
              style={{
                display: "flex",
                padding: "14px 18px",
                borderBottom: i < projects.length - 1 ? "1px solid var(--hair-soft)" : "none",
                textDecoration: "none",
                color: "inherit",
                fontSize: 14,
              }}
            >
              {p}
            </a>
          ))}
        </div>
      </div>
    );
  }

  const filepath = path.join(VAULT_PATH, meta.file);
  const raw = await fs.readFile(filepath, "utf-8").catch(() => "");

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 800, margin: "0 auto" }}>
      <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, marginBottom: 24 }}>
        {meta.title}
      </h1>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--ink)",
          margin: 0,
        }}
      >
        {raw || "(vacío)"}
      </pre>
    </div>
  );
}
