import { createNote } from "@/app/actions";
import Link from "next/link";

export default function CaptureNota() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "40px 56px",
        maxWidth: 880,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>
          Nueva nota
        </h1>
        <Link href="/" className="btn ghost sm" style={{ textDecoration: "none" }}>
          Cancelar (Esc)
        </Link>
      </div>

      <form
        action={createNote}
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}
      >
        <textarea
          name="body"
          className="input"
          placeholder="Escribí acá. Rufino se encarga del resto al procesar."
          autoFocus
          required
          style={{
            flex: 1,
            minHeight: 400,
            resize: "none",
            fontSize: 16,
            lineHeight: 1.6,
            padding: "24px 28px",
            border: "1px solid var(--hair-soft)",
          }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <p style={{ flex: 1, fontSize: 12, color: "var(--ink-3)" }}>
            Se guarda como <span className="mono">.md</span> en la raíz de <span className="mono">rufino/</span>.
            El cron diario la procesa a las 19:00.
          </p>
          <button type="submit" className="btn primary">
            Guardar nota (⌘+Enter)
          </button>
        </div>
      </form>
    </div>
  );
}
