import { readTodos } from "@/lib/vault";
import { PendientesFilters } from "@/components/pendientes-filters";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const todos = await readTodos();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Pendientes
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {todos.porHacer.length} por hacer · {todos.enProgreso.length} en progreso ·{" "}
          {todos.completados.length} completados
        </p>
      </header>

      <PendientesFilters
        porHacer={todos.porHacer}
        enProgreso={todos.enProgreso}
        completados={todos.completados}
      />
    </div>
  );
}
