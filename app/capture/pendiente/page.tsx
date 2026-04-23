import { createTodo } from "@/app/actions";
import Link from "next/link";

export default function CapturePendiente() {
  return (
    <div style={{ padding: "40px 56px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>
          Nuevo pendiente
        </h1>
        <Link href="/" className="btn ghost sm" style={{ textDecoration: "none" }}>
          Cancelar (Esc)
        </Link>
      </div>

      <form action={createTodo} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label className="label" htmlFor="desc">
            Descripción
          </label>
          <input
            id="desc"
            name="desc"
            className="input"
            placeholder="Qué hay que hacer"
            autoFocus
            required
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="label" htmlFor="projectArista">
              Proyecto / Arista
            </label>
            <input
              id="projectArista"
              name="projectArista"
              className="input"
              placeholder="ej: oiko/producto"
              defaultValue="general"
            />
          </div>
          <div>
            <label className="label" htmlFor="deadline">
              Deadline
            </label>
            <input id="deadline" name="deadline" type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="people">
            Personas (separadas por espacio, con @)
          </label>
          <input id="people" name="people" className="input" placeholder="@alejo @gabi" />
        </div>

        <div>
          <label className="label">Prioridad</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["alta", "media", "baja"] as const).map((p) => (
              <label key={p} className="chip" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  defaultChecked={p === "media"}
                  style={{ marginRight: 4 }}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="submit" className="btn primary">
            Guardar pendiente
          </button>
        </div>
      </form>
    </div>
  );
}
