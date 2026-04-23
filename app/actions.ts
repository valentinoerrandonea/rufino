"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeRawNote, appendTodo, writePersonFile } from "@/lib/vault";

export async function createNote(formData: FormData): Promise<void> {
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const firstLine = body.split("\n").find((l) => l.trim()) || "nota";
  const slug = firstLine
    .slice(0, 60)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const base = slug || `nota-${Date.now()}`;
  const filename = `${base}-${Date.now().toString().slice(-6)}.md`;

  await writeRawNote(filename, body);
  revalidatePath("/");
  revalidatePath("/notes");
  redirect("/");
}

export async function createTodo(formData: FormData): Promise<void> {
  const desc = String(formData.get("desc") || "").trim();
  const projectArista = String(formData.get("projectArista") || "general").trim();
  const peopleStr = String(formData.get("people") || "").trim();
  const deadline = String(formData.get("deadline") || "").trim() || null;
  const priority = String(formData.get("priority") || "media") as "alta" | "media" | "baja";

  if (!desc) return;

  const people = peopleStr
    .split(/[\s,]+/)
    .map((p) => p.replace(/^@/, ""))
    .filter(Boolean);

  await appendTodo({ desc, projectArista, people, deadline, priority });
  revalidatePath("/");
  revalidatePath("/pendientes");
  redirect("/pendientes");
}

export async function createPerson(formData: FormData): Promise<void> {
  const name = String(formData.get("name") || "").trim();
  const relation = String(formData.get("relation") || "").trim();
  const rol = String(formData.get("rol") || "").trim();
  const projectsStr = String(formData.get("projects") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  if (!name) return;

  const id = name
    .toLowerCase()
    .split(/\s+/)[0]
    .replace(/[^a-z]/g, "")
    .slice(0, 20);

  const projects = projectsStr
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  await writePersonFile({ id, name, relation, rol, projects, bio });
  revalidatePath("/");
  revalidatePath("/people");
  redirect("/people");
}
