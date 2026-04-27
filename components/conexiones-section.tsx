/**
 * Placeholder for the typed-relationships ("Conexiones") section.
 * Real content (triples, in/out columns) lands with F4. For now this
 * component just shows the empty state so detail pages already have
 * the section header in place.
 */
export function ConexionesSection() {
  return (
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
        Conexiones
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
          }}
        >
          0
        </span>
      </h2>
      <div
        style={{
          border: "1px dashed var(--hair)",
          borderRadius: 8,
          padding: "18px 22px",
          color: "var(--ink-3)",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        Todavía no hay conexiones tipadas. Editá esta entidad y agregá una para empezar.
      </div>
    </section>
  );
}
