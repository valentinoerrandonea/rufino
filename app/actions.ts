"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeRawNote, appendTodo, writePersonFile, VAULT_PATH } from "@/lib/vault";
import {
  updateTodoFieldsInFile,
  updateTodoInFile,
  updateTodoProjectInFile,
} from "@/lib/todos";
import { triggerProcessor } from "@/lib/processor";

type TodoState = "todo" | "done";

interface ToggleTodoParams {
  origin: string;
  desc: string;
  currentState: TodoState;
  nextState: TodoState;
}

export async function toggleTodoState(params: ToggleTodoParams): Promise<void> {
  const { origin, desc, nextState } = params;
  await updateTodoInFile({ origin, desc, nextState });
  revalidatePath("/");
  revalidatePath("/pendientes");
}

interface MoveTodoProjectParams {
  origin: string;
  desc: string;
  newProjectArista: string;
}

export async function moveTodoProject(params: MoveTodoProjectParams): Promise<void> {
  await updateTodoProjectInFile(params);
  revalidatePath("/");
  revalidatePath("/pendientes");
}

interface UpdateTodoFieldsParams {
  origin: string;
  desc: string;
  newDesc: string;
  newPeople: string;
  newDeadline?: string;
}

export async function updateTodoFields(params: UpdateTodoFieldsParams): Promise<void> {
  await updateTodoFieldsInFile(params);
  revalidatePath("/");
  revalidatePath("/pendientes");
}

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

  // Fire the processor in the background — it will pick up this note (and any
  // others waiting in the inbox) and process them asynchronously. The script
  // itself handles locking to avoid concurrent runs.
  triggerProcessor();

  revalidatePath("/");
  revalidatePath("/notes");
  redirect("/notes");
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

/**
 * Save edited content back to a file in the vault.
 * Guards: only accepts paths inside VAULT_PATH (prevents path traversal).
 */
export async function saveFileContent(params: {
  /** Path relative to the vault root (e.g., "rufino/general/tech/foo.md" or "perfil.md") */
  relativePath: string;
  content: string;
  /** Paths to revalidate (e.g., ["/notes/foo", "/notes"]) */
  revalidate?: string[];
}): Promise<void> {
  const { relativePath, content, revalidate = [] } = params;

  // Normalize and validate
  const target = path.resolve(VAULT_PATH, relativePath);
  const rel = path.relative(VAULT_PATH, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Invalid path: outside vault");
  }

  // Ensure the file exists (only edit, not create-new-anywhere)
  try {
    await fs.access(target);
  } catch {
    throw new Error(`File not found: ${relativePath}`);
  }

  await fs.writeFile(target, content, "utf-8");
  for (const p of revalidate) revalidatePath(p);
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
