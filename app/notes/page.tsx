import { readProcessedNotes, readRawNotes } from "@/lib/vault";
import { relTime } from "@/components/atoms";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, rawNotes] = await Promise.all([readProcessedNotes(), readRawNotes()]);

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Notas
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {notes.length} procesadas · {rawNotes.length} sin procesar
        </p>
      </header>

      {rawNotes.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 className="serif" style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
            Inbox (sin procesar)
          </h2>
          <div className="card" style={{ overflow: "hidden" }}>
            {rawNotes.map((n, i) => (
              <div
                key={n.id}
                style={{
                  padding: "14px 18px",
                  borderBottom: i < rawNotes.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink)",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.excerpt}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                    <span className="mono">{n.filename}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                  {relTime(n.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="serif" style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
          Procesadas
        </h2>
        {notes.length === 0 ? (
          <div
            className="card-soft"
            style={{ padding: 24, textAlign: "center", color: "var(--ink-2)" }}
          >
            Aún no hay notas procesadas.
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {notes.map((n, i) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                className="hoverable"
                style={{
                  padding: "14px 18px",
                  borderBottom: i < notes.length - 1 ? "1px solid var(--hair-soft)" : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 16,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}
                  >
                    <h3 className="serif" style={{ fontSize: 15, fontWeight: 500 }}>
                      {n.title}
                    </h3>
                    <span style={{ fontSize: 11, color: "var(--accent)" }}>
                      {n.project}
                      {n.arista ? ` · ${n.arista}` : ""}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.excerpt}
                  </p>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                  {relTime(n.processed || n.created)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
