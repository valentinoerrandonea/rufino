import { readPeople } from "@/lib/vault";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await readPeople();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Personas
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {people.length} en el roster
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {people.map((p) => (
          <div key={p.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 16, fontWeight: 500 }}>
                  {p.name}
                </div>
                {p.rol && (
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{p.rol}</div>
                )}
              </div>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {p.mentions} {p.mentions === 1 ? "mención" : "menciones"}
              </span>
            </div>
            {p.bio && (
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  lineHeight: 1.5,
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                {p.bio}
              </p>
            )}
            {p.projects.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                {p.projects.map((pr) => (
                  <span key={pr} className="chip sm">
                    {pr}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
