import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readConcept } from "@/lib/concepts";
import { connectionsFor } from "@/lib/triples";
import { VAULT_PATH } from "@/lib/vault";
import { ConceptEditor, ConceptEditButton } from "@/components/concept-editor";
import { ConexionesSection } from "@/components/conexiones-section";
import { DeleteButton } from "@/components/delete-button";

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

export default async function ConceptoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const concept = await readConcept(id);
  if (!concept) notFound();

  const filePath = path.join(VAULT_PATH, "conceptos", `${id}.md`);
  const rawFile = await fs.readFile(filePath, "utf-8");
  const connections = await connectionsFor(id);

  const conceptFilePath = path.join("conceptos", `${id}.md`);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 880, margin: "0 auto" }}>
      <ConceptEditor
        relativePath={conceptFilePath}
        initialContent={rawFile}
        revalidate={[`/memory/concepto/${id}`, "/memory/conceptos", "/"]}
        initialName={concept.name}
        aliases={concept.aliases}
      >
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
            href="/memory/conceptos"
            className="btn ghost sm"
            style={{ textDecoration: "none", display: "inline-flex", marginLeft: -8 }}
          >
            ← Conceptos
          </Link>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ConceptEditButton />
            <DeleteButton
              relativePath={conceptFilePath}
              itemLabel={`el concepto ${concept.name}`}
              redirectTo="/memory/conceptos"
              revalidate={["/memory/conceptos", "/"]}
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
            Memoria · Concepto
          </div>
          <h1
            className="serif"
            style={{
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {concept.name}
          </h1>
          {concept.aliases.length > 0 && (
            <p
              className="serif"
              style={{
                fontSize: 16,
                color: "var(--ink-2)",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {concept.aliases.join(" · ")}
            </p>
          )}
          {concept.definition && (
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-2)",
                marginTop: 14,
                lineHeight: 1.6,
                maxWidth: 640,
              }}
            >
              {concept.definition}
            </p>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 18,
              fontSize: 12,
              color: "var(--ink-3)",
              flexWrap: "wrap",
            }}
          >
            <span>{concept.mentionsCount} menciones</span>
            {concept.firstSeen && (
              <>
                <span style={{ color: "var(--hair)" }}>·</span>
                <span>primera vez {relTimeLong(concept.firstSeen)}</span>
              </>
            )}
            {concept.lastSeen && (
              <>
                <span style={{ color: "var(--hair)" }}>·</span>
                <span>última {relTimeLong(concept.lastSeen)}</span>
              </>
            )}
          </div>
        </header>

        <ConexionesSection
          outgoing={connections.outgoing}
          incoming={connections.incoming}
          unresolvedOut={connections.unresolvedOut}
        />

        <section style={{ marginBottom: 36 }}>
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
            Menciones en notas
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                fontFamily: "var(--font-sans)",
                fontWeight: 400,
              }}
            >
              {concept.mentions.length}
            </span>
          </h2>
          {concept.mentions.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--hair)",
                borderRadius: 8,
                padding: "18px 22px",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Este concepto fue creado manualmente y todavía no fue mencionado en ninguna nota.
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {concept.mentions.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/notes/${m.id}`}
                  className="hoverable"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 16,
                    padding: "14px 22px",
                    borderBottom:
                      i < concept.mentions.length - 1
                        ? "1px solid var(--hair-soft)"
                        : "none",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
                    <div
                      className="serif"
                      style={{ fontSize: 14.5, color: "var(--ink)" }}
                    >
                      {m.title}
                    </div>
                    {m.project && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--accent)",
                          marginTop: 3,
                        }}
                      >
                        {m.project}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    {relTimeLong(m.date)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </ConceptEditor>
    </div>
  );
}
