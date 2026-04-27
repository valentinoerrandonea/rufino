import Link from "next/link";
import { readPeople } from "@/lib/vault";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await readPeople();

  return (
    <div style={{ padding: "48px 56px 80px", maxWidth: 960, margin: "0 auto" }}>
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
            Personas
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
            {people.length} en el roster
          </p>
        </div>
        <Link
          href="/capture/persona"
          className="btn primary"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          + Nueva persona
        </Link>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {people.map((p) => (
          <Link
            key={p.id}
            href={`/people/${p.id}`}
            className="card hoverable"
            style={{
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="serif"
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name}
              </div>
              {p.rol && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {p.rol}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
