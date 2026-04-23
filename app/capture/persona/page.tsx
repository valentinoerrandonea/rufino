import { createPerson } from "@/app/actions";
import Link from "next/link";

export default function CapturePersona() {
  return (
    <div style={{ padding: "40px 56px", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>
          Nueva persona
        </h1>
        <Link href="/" className="btn ghost sm" style={{ textDecoration: "none" }}>
          Cancelar (Esc)
        </Link>
      </div>

      <form action={createPerson} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label className="label" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            className="input"
            placeholder="Alejo Martínez"
            autoFocus
            required
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="label" htmlFor="rol">
              Rol
            </label>
            <input id="rol" name="rol" className="input" placeholder="CEO, diseñador, etc" />
          </div>
          <div>
            <label className="label" htmlFor="relation">
              Relación
            </label>
            <input
              id="relation"
              name="relation"
              className="input"
              placeholder="compañero de trabajo, amigo, cliente"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="projects">
            Proyectos (separados por espacio)
          </label>
          <input id="projects" name="projects" className="input" placeholder="oiko umbru" />
        </div>

        <div>
          <label className="label" htmlFor="bio">
            Bio / contexto
          </label>
          <textarea
            id="bio"
            name="bio"
            className="input"
            rows={5}
            placeholder="Quién es, cómo se conocieron, cualquier contexto relevante"
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="submit" className="btn primary">
            Guardar persona
          </button>
        </div>
      </form>
    </div>
  );
}
