import { notFound } from "next/navigation";
import Link from "next/link";
import { readProjectEntry } from "@/lib/projects";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string; entryId: string }>;
};

function relTimeLong(iso: string | null): string {
  if (!iso) return "sin fecha";
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

export default async function AprendizajeDetailPage({ params }: PageProps) {
  const { id, entryId } = await params;
  const entry = await readProjectEntry(id, "aprendizaje", entryId);
  if (!entry) notFound();

  // Strip h1 from content for display (it's shown in the header)
  const bodyContent = entry.content.replace(/^#\s+.+$/m, "").trim();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href={`/projects/${id}`}
          className="btn ghost sm"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            marginLeft: -8,
          }}
        >
          ← Volver al proyecto
        </Link>
      </div>

      <header
        style={{
          marginBottom: 32,
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
          {id} · Aprendizaje
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 30,
            fontWeight: 400,
            lineHeight: 1.15,
            marginBottom: 10,
            fontStyle: "italic",
          }}
        >
          &ldquo;{entry.title}&rdquo;
        </h1>
        {entry.when && (
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Actualizado {relTimeLong(entry.when)}
          </div>
        )}
        {entry.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {entry.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  padding: "2px 9px",
                  borderRadius: 999,
                  background: "var(--surface-2)",
                  border: "1px solid var(--hair-soft)",
                  color: "var(--ink-2)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <div style={{ lineHeight: 1.7 }}>
        <Markdown content={bodyContent} fontSize={15} />
      </div>
    </div>
  );
}
