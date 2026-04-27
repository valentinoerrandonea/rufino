import Link from "next/link";
import { readTodos } from "@/lib/vault";
import { PendientesFilters } from "@/components/pendientes-filters";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const todos = await readTodos();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
      <header
        style={{
          marginBottom: 32,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
            Pendientes
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
            {todos.porHacer.length} por hacer · {todos.completados.length} completados
          </p>
        </div>
        <Link
          href="/capture/pendiente"
          className="btn primary"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          + Nuevo pendiente
        </Link>
      </header>

      <PendientesFilters
        porHacer={todos.porHacer}
        completados={todos.completados}
      />
    </div>
  );
}
