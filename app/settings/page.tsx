import { VAULT_PATH, RUFINO_PATH, getProjectStats } from "@/lib/vault";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const stats = await getProjectStats();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 800, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Configuración
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          Vista de solo lectura del sistema
        </p>
      </header>

      <Box title="Paths">
        <Row label="Vault" value={VAULT_PATH} />
        <Row label="Rufino" value={RUFINO_PATH} />
        <Row label="Prompt diario" value="~/.claude/prompts/rufino-daily.md" />
        <Row label="Regla global" value="~/.claude/rules/common/rufino.md" />
        <Row label="Comando /remember" value="~/.claude/commands/remember.md" />
      </Box>

      <Box title="Estado del vault">
        <Row label="Notas procesadas" value={String(stats.notesCount)} />
        <Row label="Notas sin procesar" value={String(stats.rawCount)} />
        <Row label="Pendientes activos" value={String(stats.todosActive)} />
        <Row label="Pendientes vencidos" value={String(stats.todosOverdue)} />
        <Row label="Personas registradas" value={String(stats.peopleCount)} />
        <Row label="Proyectos con notas" value={String(stats.projectsCount)} />
      </Box>

      <Box title="Proyectos">
        {stats.projects.map((p) => (
          <Row key={p.id} label={p.id} value={`${p.count} nota${p.count === 1 ? "" : "s"}`} />
        ))}
      </Box>

      <Box title="Cron">
        <Row label="Hora" value="19:00 ART (22:00 UTC)" />
        <Row label="Log" value="~/rufino-cron.log" />
      </Box>

      <Box title="Repos">
        <Row label="macOS" value="https://github.com/valentinoerrandonea/rufino-mac" />
        <Row label="Windows" value="https://github.com/valentinoerrandonea/rufino-windows" />
      </Box>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="serif" style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
        {title}
      </h2>
      <div className="card" style={{ padding: "8px 0" }}>
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: 16,
        padding: "10px 18px",
        fontSize: 13,
      }}
    >
      <div style={{ color: "var(--ink-2)" }}>{label}</div>
      <div className="mono" style={{ color: "var(--ink)", fontSize: 12, wordBreak: "break-all" }}>
        {value}
      </div>
    </div>
  );
}
