/**
 * Inline badge that shows "procesando" while a note's status is queued or
 * processing. Used in note/person/project detail pages and list rows.
 *
 * Pair with <ProcessingPoller /> on the same page so the page auto-refreshes
 * until the status flips to processed.
 */
export function ProcessingBadge({ status }: { status?: string | null }) {
  if (status !== "queued" && status !== "processing") return null;
  const label = status === "queued" ? "en cola" : "procesando";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        fontSize: 11,
        lineHeight: 1.4,
        borderRadius: 4,
        border: "1px solid var(--accent-soft)",
        background: "var(--surface-2)",
        color: "var(--accent)",
        whiteSpace: "nowrap",
      }}
      title="Rufino está procesando esta nota — la augmentation va a aparecer en unos segundos."
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--accent)",
          animation: "rufino-pulse 1.2s ease-in-out infinite",
        }}
      />
      {label}
      <style>{`
        @keyframes rufino-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </span>
  );
}
