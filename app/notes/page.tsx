import { readProcessedNotes, readRawNotes } from "@/lib/vault";
import { isProcessorRunning } from "@/lib/processor";
import { relTime } from "@/components/atoms";
import { ProcessingPoller } from "@/components/processing-poller";
import { NotesFilters } from "@/components/notes-filters";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, rawNotes] = await Promise.all([readProcessedNotes(), readRawNotes()]);
  const processing = isProcessorRunning();

  // Strip heavy body fields before passing to the client component
  const lite = notes.map((n) => ({
    id: n.id,
    title: n.title,
    project: n.project,
    arista: n.arista,
    type: n.type,
    tags: n.tags,
    excerpt: n.excerpt,
    created: n.created,
    processed: n.processed,
  }));

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      {processing && <ProcessingPoller />}
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Notas
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {notes.length} procesadas · {rawNotes.length} sin procesar
          {processing && (
            <span style={{ marginLeft: 10, color: "var(--accent)" }}>
              · ⏳ procesando…
            </span>
          )}
        </p>
      </header>

      {rawNotes.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2
            className="serif"
            style={{
              fontSize: 16,
              fontWeight: 500,
              marginBottom: 10,
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            Inbox (sin procesar)
            <span
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                fontFamily: "var(--font-sans)",
                fontWeight: 400,
              }}
            >
              {rawNotes.length}
            </span>
            {processing && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--accent)",
                  marginLeft: 4,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 400,
                }}
              >
                ⏳ en curso · 1-2 min por nota
              </span>
            )}
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

      {notes.length === 0 ? (
        <div
          className="card-soft"
          style={{ padding: 24, textAlign: "center", color: "var(--ink-2)" }}
        >
          Aún no hay notas procesadas.
        </div>
      ) : (
        <NotesFilters notes={lite} />
      )}
    </div>
  );
}
