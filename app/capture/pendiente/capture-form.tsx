"use client";

import { useRef, useState, startTransition } from "react";
import Link from "next/link";
import { createTodo } from "@/app/actions";
import { MentionDropdown, detectMention, applyMention } from "@/components/mention-dropdown";
import { TagDropdown } from "@/components/tag-dropdown";

interface CaptureFormProps {
  mentionables: { people: string[]; projects: string[] };
  projectTags: string[];
}

export function CaptureForm({ mentionables, projectTags }: CaptureFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Controlled inputs for mention/tag features
  const [desc, setDesc] = useState("");
  const [people, setPeople] = useState("");
  const [projectArista, setProjectArista] = useState("general");

  // Mention state for desc field
  const [descMention, setDescMention] = useState<{
    active: boolean;
    query: string;
    atIndex: number;
  }>({ active: false, query: "", atIndex: -1 });

  // Mention state for people field
  const [peopleMention, setPeopleMention] = useState<{
    active: boolean;
    query: string;
    atIndex: number;
  }>({ active: false, query: "", atIndex: -1 });

  // Tag dropdown state for projectArista field
  const [tagDropdownActive, setTagDropdownActive] = useState(false);

  const allMentionables = [...mentionables.people, ...mentionables.projects];

  // ── desc field handlers ─────────────────────────────────────────────────
  const handleDescChange = (value: string) => {
    setDesc(value);
    const result = detectMention(value);
    if (result.active) {
      setDescMention({ active: true, query: result.query, atIndex: result.atIndex });
    } else {
      setDescMention({ active: false, query: "", atIndex: -1 });
    }
  };

  const handleDescMentionSelect = (selected: string) => {
    const newVal = applyMention(desc, descMention.atIndex, descMention.query, selected);
    setDesc(newVal);
    setDescMention({ active: false, query: "", atIndex: -1 });
  };

  // ── people field handlers ───────────────────────────────────────────────
  const handlePeopleChange = (value: string) => {
    setPeople(value);
    const result = detectMention(value);
    if (result.active) {
      setPeopleMention({ active: true, query: result.query, atIndex: result.atIndex });
    } else {
      setPeopleMention({ active: false, query: "", atIndex: -1 });
    }
  };

  const handlePeopleMentionSelect = (selected: string) => {
    const newVal = applyMention(people, peopleMention.atIndex, peopleMention.query, selected);
    setPeople(newVal);
    setPeopleMention({ active: false, query: "", atIndex: -1 });
  };

  // ── projectArista field handlers ────────────────────────────────────────
  const handleProjectAristaChange = (value: string) => {
    setProjectArista(value);
    setTagDropdownActive(value.length > 0);
  };

  const handleTagSelect = (tag: string) => {
    setProjectArista(tag);
    setTagDropdownActive(false);
  };

  // ── form action handler ─────────────────────────────────────────────────
  // We use the native form action (action={createTodo}) but with controlled
  // inputs that sync their values to hidden inputs before submission.
  // This preserves Next.js's server action redirect behavior.
  const handleAction = (formData: FormData) => {
    // Inject controlled values so formData always has the latest
    formData.set("desc", desc);
    formData.set("people", people);
    formData.set("projectArista", projectArista);
    startTransition(async () => {
      await createTodo(formData);
    });
  };

  return (
    <div style={{ padding: "40px 56px", maxWidth: 700, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>
          Nuevo pendiente
        </h1>
        <Link href="/" className="btn ghost sm" style={{ textDecoration: "none" }}>
          Cancelar (Esc)
        </Link>
      </div>

      <form
        ref={formRef}
        action={handleAction}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Descripción with @mention */}
        <div style={{ position: "relative" }}>
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
            value={desc}
            onChange={(e) => handleDescChange(e.target.value)}
            onBlur={() =>
              setTimeout(
                () => setDescMention((m) => ({ ...m, active: false })),
                150
              )
            }
            autoComplete="off"
          />
          {descMention.active && (
            <MentionDropdown
              suggestions={allMentionables}
              query={descMention.query}
              onSelect={handleDescMentionSelect}
              onClose={() =>
                setDescMention({ active: false, query: "", atIndex: -1 })
              }
            />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Proyecto / Arista with tag dropdown */}
          <div style={{ position: "relative" }}>
            <label className="label" htmlFor="projectArista">
              Proyecto / Arista
            </label>
            <input
              id="projectArista"
              name="projectArista"
              className="input"
              placeholder="ej: oiko/producto"
              value={projectArista}
              onChange={(e) => handleProjectAristaChange(e.target.value)}
              onFocus={() => {
                if (projectArista && projectArista !== "general") {
                  setTagDropdownActive(true);
                }
              }}
              onBlur={() =>
                setTimeout(() => setTagDropdownActive(false), 150)
              }
              autoComplete="off"
            />
            {tagDropdownActive && (
              <TagDropdown
                tags={projectTags}
                query={projectArista}
                onSelect={handleTagSelect}
                onClose={() => setTagDropdownActive(false)}
              />
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="label" htmlFor="deadline">
              Deadline
            </label>
            <input id="deadline" name="deadline" type="date" className="input" />
          </div>
        </div>

        {/* Personas with @mention */}
        <div style={{ position: "relative" }}>
          <label className="label" htmlFor="people">
            Personas (separadas por espacio, con @)
          </label>
          <input
            id="people"
            name="people"
            className="input"
            placeholder="@alejo @gabi"
            value={people}
            onChange={(e) => handlePeopleChange(e.target.value)}
            onBlur={() =>
              setTimeout(
                () => setPeopleMention((m) => ({ ...m, active: false })),
                150
              )
            }
            autoComplete="off"
          />
          {peopleMention.active && (
            <MentionDropdown
              suggestions={mentionables.people}
              query={peopleMention.query}
              onSelect={handlePeopleMentionSelect}
              onClose={() =>
                setPeopleMention({ active: false, query: "", atIndex: -1 })
              }
            />
          )}
        </div>

        {/* Prioridad */}
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

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 12,
          }}
        >
          <button type="submit" className="btn primary">
            Guardar pendiente
          </button>
        </div>
      </form>
    </div>
  );
}
