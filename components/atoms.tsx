import type { ReactNode } from "react";

export function Tag({ children, tone }: { children: ReactNode; tone?: "muted" }) {
  return (
    <span className="tag" style={{ color: tone === "muted" ? "var(--ink-3)" : "var(--ink-2)" }}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className={href ? "card hoverable" : "card"} style={{ padding: 18 }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>{label}</div>
      <div className="serif" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
  if (href)
    return (
      <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </a>
    );
  return content;
}

export function Section({
  title,
  action,
  children,
  style,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section style={{ marginBottom: 32, ...style }}>
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          {title && (
            <h2 className="serif" style={{ fontSize: 18, fontWeight: 500 }}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function fmtDate(iso: string, opts: { time?: boolean } = {}): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}${
    opts.time
      ? ` · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
      : ""
  }`;
}

export function relTime(iso: string): string {
  if (!iso) return "—";

  // Date-only strings ("YYYY-MM-DD") parsed with `new Date()` become UTC
  // midnight, which shifts by the TZ offset and makes "today" look like
  // "hace N horas". Treat them as local calendar dates instead.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  if (dateOnly) {
    const [y, m, d] = iso.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const now = new Date();
    const midToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((midToday.getTime() - target.getTime()) / 86400000);
    if (days <= 0) return "hoy";
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} días`;
    return fmtDate(iso);
  }

  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hace instantes";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return fmtDate(iso);
}

export function deadlineStatus(iso: string | null) {
  if (!iso) return { label: "sin fecha", color: "var(--ink-3)", overdue: false };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { label: "sin fecha", color: "var(--ink-3)", overdue: false };
  const days = Math.floor((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `vencido · ${fmtDate(iso)}`, color: "var(--red)", overdue: true };
  if (days === 0) return { label: "hoy", color: "var(--accent)", overdue: false };
  if (days === 1) return { label: "mañana", color: "var(--accent)", overdue: false };
  if (days <= 3) return { label: `en ${days} días`, color: "var(--amber)", overdue: false };
  if (days <= 7) return { label: `en ${days} días`, color: "var(--ink-2)", overdue: false };
  return { label: fmtDate(iso), color: "var(--ink-3)", overdue: false };
}
