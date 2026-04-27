"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyLintAction, runLintNow } from "@/app/actions";
import type { LintIssue, LintReport, LintRunSummary, LintSeverity } from "@/lib/lint";

interface Props {
  report: LintReport | null;
  history: LintRunSummary[];
}

export function SaludScreen({ report, history }: Props) {
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleRunNow = async () => {
    setRunning(true);
    setGlobalError(null);
    const r = await runLintNow();
    setRunning(false);
    if (!r.ok) setGlobalError(r.error);
  };

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 28 }}>
        <Eyebrow>Sistema</Eyebrow>
        <h1
          className="serif"
          style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.15 }}
        >
          Salud del vault
        </h1>
        {report ? (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-2)",
              marginTop: 8,
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Última corrida: {relativeFromIso(report.ranAt)} · {report.issuesTotal}{" "}
            issues encontrados. La próxima pasa el domingo a las 22:00.
          </p>
        ) : (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-2)",
              marginTop: 8,
              maxWidth: 640,
              lineHeight: 1.55,
            }}
          >
            Todavía no se corrió ningún lint pass. El próximo es el domingo a las 22:00.
          </p>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            onClick={handleRunNow}
            disabled={running}
          >
            {running ? "Corriendo…" : "↻ Correr lint ahora"}
          </button>
          {history.length > 1 && (
            <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
              {history.length} corridas anteriores
            </span>
          )}
        </div>

        {globalError && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "rgba(196, 149, 48, 0.10)",
              border: "1px solid var(--amber)",
              borderRadius: 8,
              color: "var(--ink-2)",
              fontSize: 12.5,
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            {globalError}
          </div>
        )}
      </header>

      {!report ? (
        <EmptyDashed>
          Cuando corra el primer lint pass vas a ver acá los issues agrupados por severidad y tipo.
          Mientras tanto, el cron está agendado.
        </EmptyDashed>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 32,
            }}
          >
            <StatCard label="Issues totales" value={report.issuesTotal} sub="abiertos" />
            <StatCard
              label="High"
              value={report.severityHigh}
              sub="atención inmediata"
              subTone="var(--red)"
            />
            <StatCard
              label="Medium"
              value={report.severityMedium}
              sub="esta semana"
              subTone="var(--amber)"
            />
            <StatCard
              label="Low"
              value={report.severityLow}
              sub="cuando puedas"
            />
          </div>

          {report.groups.length === 0 ? (
            <EmptyDashed>Tu vault está limpio. Próxima corrida programada.</EmptyDashed>
          ) : (
            <div>
              {report.groups.map((g, gi) => (
                <LintGroup key={gi} group={g} defaultOpen={gi < 3} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LintGroup({
  group,
  defaultOpen,
}: {
  group: LintReport["groups"][number];
  defaultOpen: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      style={{
        marginBottom: 16,
        border: "1px solid var(--hair)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 18px",
          listStyle: "none",
          cursor: "pointer",
          userSelect: "none",
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--hair-soft)",
        }}
      >
        <SeverityDot level={group.severity} />
        <span
          className="serif"
          style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)" }}
        >
          {group.type}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {group.items.length} {group.items.length === 1 ? "issue" : "issues"}
        </span>
      </summary>
      <div>
        {group.items.map((it, i) => (
          <IssueRow
            key={it.id}
            issue={it}
            isLast={i === group.items.length - 1}
          />
        ))}
      </div>
    </details>
  );
}

function IssueRow({ issue, isLast }: { issue: LintIssue; isLast: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fire = (kind: string, params?: Record<string, unknown>) => {
    setError(null);
    startTransition(async () => {
      const r = await applyLintAction({
        issueId: issue.id,
        kind,
        actionParams: params,
      });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--hair-soft)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="serif"
            style={{
              fontSize: 14.5,
              color: "var(--ink)",
              lineHeight: 1.4,
            }}
          >
            {issue.title}
          </div>
          {issue.detail && (
            <div
              style={{
                fontSize: 12.5,
                color: "var(--ink-2)",
                marginTop: 4,
                lineHeight: 1.55,
              }}
            >
              {issue.detail}
            </div>
          )}
          {issue.refs.length > 0 && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {issue.refs.map((r, ri) => (
                <span
                  key={ri}
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-2)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "var(--surface-2)",
                    border: "1px solid var(--hair-soft)",
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {issue.action && (
            <button
              type="button"
              className="btn sm"
              disabled={isPending}
              onClick={() => fire(issue.action!.kind, issue.action!.params)}
            >
              {issue.action.label}
            </button>
          )}
          <button
            type="button"
            className="btn sm ghost"
            disabled={isPending}
            onClick={() => fire("ignore")}
            title="Marcar como ignorado"
          >
            ×
          </button>
        </div>
      </div>
      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11.5,
            color: "var(--amber)",
            background: "rgba(196, 149, 48, 0.08)",
            padding: "6px 10px",
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: number;
  sub?: string;
  subTone?: string;
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>
        {label}
      </div>
      <div
        className="serif"
        style={{ fontSize: 28, fontWeight: 400, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: subTone ?? "var(--ink-3)",
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function SeverityDot({ level }: { level: LintSeverity }) {
  const m: Record<LintSeverity, string> = {
    high: "var(--red)",
    medium: "var(--amber)",
    low: "var(--ink-3)",
  };
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: m[level],
        flexShrink: 0,
      }}
    />
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 0.6,
        fontWeight: 600,
        color: "var(--accent)",
        textTransform: "uppercase",
        marginBottom: 6,
        fontFamily: "var(--font-mono)",
      }}
    >
      {children}
    </div>
  );
}

function EmptyDashed({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function relativeFromIso(iso: string): string {
  const t = new Date(iso);
  const ms = Date.now() - t.getTime();
  if (ms < 0) return "en el futuro";
  const min = Math.floor(ms / 60000);
  if (min < 60) return min === 0 ? "hace instantes" : `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return t.toLocaleDateString("es-AR");
}
