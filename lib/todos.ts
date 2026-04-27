import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const VAULT_PATH = process.env.RUFINO_VAULT_PATH || "/Users/val/Files/vaultlentino";
const RUFINO_PATH = path.join(VAULT_PATH, "rufino");
const PENDIENTES_FILE = path.join(RUFINO_PATH, "_pendientes.md");

type NextState = "todo" | "done";

interface UpdateTodoOpts {
  origin: string;
  desc: string;
  nextState: NextState;
}

// Section names as they appear in the markdown headers. "En progreso" is
// kept here so existing rows in that legacy section can still be located
// for the active→done flow; the dashboard never writes new rows there.
const SECTION_NAMES = {
  porHacer: "Por hacer",
  enProgreso: "En progreso",
  completados: "Completados",
} as const;

const STATE_MARKERS: Record<NextState, string> = {
  todo: "[ ]",
  done: "[x]",
};

type SectionKey = keyof typeof SECTION_NAMES;

interface ParsedFile {
  frontmatter: string; // raw frontmatter block including --- delimiters
  sections: Record<SectionKey, string[]>; // lines within each section (including header, separator, rows)
  sectionOrder: string[]; // to preserve any other content outside known sections
  raw: string; // original file content
}

function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  if (!raw.startsWith("---")) {
    return { frontmatter: "", body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: "", body: raw };
  }
  const frontmatter = raw.slice(0, end + 4); // include trailing ---
  const body = raw.slice(end + 4);
  return { frontmatter, body };
}

function rowMatchesTodo(line: string, origin: string, desc: string, isCompletados: boolean): boolean {
  if (!line.trim().startsWith("|")) return false;
  const cols = line
    .split("|")
    .map((c) => c.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  if (isCompletados) {
    if (cols.length < 4) return false;
    const [rowDesc, , , rowOrigin] = cols;
    const cleanOrigin = rowOrigin.replace(/\[\[|\]\]/g, "").trim();
    return rowDesc.trim() === desc.trim() && cleanOrigin === origin.trim();
  } else {
    if (cols.length < 6) return false;
    const [, rowDesc, , , , rowOrigin] = cols;
    const cleanOrigin = rowOrigin.replace(/\[\[|\]\]/g, "").trim();
    return rowDesc.trim() === desc.trim() && cleanOrigin === origin.trim();
  }
}

function extractRowData(line: string, isCompletados: boolean): Record<string, string> {
  const cols = line
    .split("|")
    .map((c) => c.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  if (isCompletados) {
    const [desc, projectArista, people, origin] = cols;
    return { desc: desc ?? "", projectArista: projectArista ?? "", people: people ?? "-", origin: origin ?? "-", created: "" };
  } else {
    const [, desc, projectArista, people, deadline, origin, created] = cols;
    return {
      desc: desc ?? "",
      projectArista: projectArista ?? "",
      people: people ?? "-",
      deadline: deadline ?? "-",
      origin: origin ?? "-",
      created: created ?? "",
    };
  }
}

function buildActiveRow(data: Record<string, string>, nextState: NextState): string {
  const marker = STATE_MARKERS[nextState];
  return `| ${marker} | ${data.desc} | ${data.projectArista} | ${data.people} | ${data.deadline ?? "-"} | ${data.origin} | ${data.created} |`;
}

function buildCompletedRow(data: Record<string, string>, today: string): string {
  return `| ${data.desc} | ${data.projectArista} | ${data.people} | ${data.origin} | ${today} |`;
}

function findSectionBounds(lines: string[], sectionName: string): { start: number; end: number } | null {
  const headerPattern = new RegExp(`^##\\s+${sectionName}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headerPattern.test(lines[i].trim())) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  // end is either next ## heading or end of lines
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

function findSeparatorIndex(lines: string[], sectionStart: number, sectionEnd: number): number {
  for (let i = sectionStart; i < sectionEnd; i++) {
    if (/^\|[-\s|]+\|$/.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function removeRowFromSection(
  lines: string[],
  sectionName: string,
  origin: string,
  desc: string,
  isCompletados: boolean
): { lines: string[]; removedData: Record<string, string> | null } {
  const bounds = findSectionBounds(lines, sectionName);
  if (!bounds) return { lines, removedData: null };

  const newLines = [...lines];
  let removedData: Record<string, string> | null = null;

  for (let i = bounds.start; i < bounds.end; i++) {
    if (rowMatchesTodo(newLines[i], origin, desc, isCompletados)) {
      removedData = extractRowData(newLines[i], isCompletados);
      newLines.splice(i, 1);
      break;
    }
  }

  return { lines: newLines, removedData };
}

function insertRowIntoSection(lines: string[], sectionName: string, newRow: string): string[] {
  const bounds = findSectionBounds(lines, sectionName);
  if (!bounds) return lines;

  const newLines = [...lines];
  // Recalculate bounds since nothing changed yet
  const separatorIdx = findSeparatorIndex(newLines, bounds.start, bounds.end);
  if (separatorIdx === -1) {
    // No separator found — insert after header (shouldn't happen but be safe)
    newLines.splice(bounds.start + 1, 0, newRow);
  } else {
    newLines.splice(separatorIdx + 1, 0, newRow);
  }
  return newLines;
}

export async function updateTodoProjectInFile(opts: {
  origin: string;
  desc: string;
  newProjectArista: string;
}): Promise<void> {
  const { origin, desc, newProjectArista } = opts;
  const sanitized = newProjectArista.trim() || "-";

  const raw = await fs.readFile(PENDIENTES_FILE, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = body.split("\n");

  // Try matching as an active row first, then as a completados row.
  // Active rows have 7 columns (state, desc, projectArista, people, deadline, origin, created),
  // completados rows have 5 (desc, projectArista, people, origin, completed).
  // The projectArista column lives at split index 3 for active, index 2 for completados.
  let updated = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) continue;

    let isCompletados: boolean | null = null;
    if (rowMatchesTodo(line, origin, desc, false)) isCompletados = false;
    else if (rowMatchesTodo(line, origin, desc, true)) isCompletados = true;
    if (isCompletados === null) continue;

    const parts = line.split("|");
    const idx = isCompletados ? 2 : 3;
    if (idx >= parts.length - 1) continue;
    parts[idx] = ` ${sanitized} `;
    lines[i] = parts.join("|");
    updated = true;
    break;
  }

  if (!updated) {
    throw new Error(`Todo not found in _pendientes.md: origin="${origin}" desc="${desc}"`);
  }

  const newBody = lines.join("\n");
  const newContent = frontmatter ? `${frontmatter}${newBody}` : newBody;
  await fs.writeFile(PENDIENTES_FILE, newContent, "utf-8");
}

export async function updateTodoFieldsInFile(opts: {
  origin: string;
  desc: string;
  newDesc: string;
  newPeople: string; // raw cell value, e.g. "@gabi @diego" or "-"
  newDeadline?: string; // active rows only; "-" or "YYYY-MM-DD"
}): Promise<void> {
  const { origin, desc } = opts;
  const newDesc = opts.newDesc.trim();
  const newPeople = opts.newPeople.trim() || "-";
  const newDeadline = (opts.newDeadline ?? "").trim() || "-";

  if (!newDesc) {
    throw new Error("Description cannot be empty");
  }
  // Markdown table cells are pipe-delimited and don't support escaping. Refuse
  // values that would break the row instead of silently corrupting the file.
  if ([newDesc, newPeople, newDeadline].some((v) => v.includes("|"))) {
    throw new Error("Field values cannot contain '|'");
  }

  const raw = await fs.readFile(PENDIENTES_FILE, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = body.split("\n");

  let updated = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) continue;

    let isCompletados: boolean | null = null;
    if (rowMatchesTodo(line, origin, desc, false)) isCompletados = false;
    else if (rowMatchesTodo(line, origin, desc, true)) isCompletados = true;
    if (isCompletados === null) continue;

    const parts = line.split("|");
    // Active row layout (split indices):
    //   1 state | 2 desc | 3 projectArista | 4 people | 5 deadline | 6 origin | 7 created
    // Completados row layout:
    //   1 desc | 2 projectArista | 3 people | 4 origin | 5 completed
    if (isCompletados) {
      if (parts.length < 7) continue;
      parts[1] = ` ${newDesc} `;
      parts[3] = ` ${newPeople} `;
    } else {
      if (parts.length < 9) continue;
      parts[2] = ` ${newDesc} `;
      parts[4] = ` ${newPeople} `;
      parts[5] = ` ${newDeadline} `;
    }
    lines[i] = parts.join("|");
    updated = true;
    break;
  }

  if (!updated) {
    throw new Error(`Todo not found in _pendientes.md: origin="${origin}" desc="${desc}"`);
  }

  const newBody = lines.join("\n");
  const newContent = frontmatter ? `${frontmatter}${newBody}` : newBody;
  await fs.writeFile(PENDIENTES_FILE, newContent, "utf-8");
}

export async function updateTodoInFile(opts: UpdateTodoOpts): Promise<void> {
  const { origin, desc, nextState } = opts;

  const raw = await fs.readFile(PENDIENTES_FILE, "utf-8");
  const today = new Date().toISOString().split("T")[0];

  // Work with the raw content line by line, preserving frontmatter as-is
  const { frontmatter, body } = splitFrontmatter(raw);
  let lines = body.split("\n");

  // Determine which section the todo currently lives in
  const activeSections: Array<{ name: string; isCompletados: false }> = [
    { name: SECTION_NAMES.porHacer, isCompletados: false },
    { name: SECTION_NAMES.enProgreso, isCompletados: false },
  ];
  const completedSection = { name: SECTION_NAMES.completados, isCompletados: true };

  let removedData: Record<string, string> | null = null;
  let foundInSection: string | null = null;

  // Search active sections first
  for (const sec of activeSections) {
    const result = removeRowFromSection(lines, sec.name, origin, desc, false);
    if (result.removedData) {
      lines = result.lines;
      removedData = result.removedData;
      foundInSection = sec.name;
      break;
    }
  }

  // If not found in active sections, search completados
  if (!removedData) {
    const result = removeRowFromSection(lines, completedSection.name, origin, desc, true);
    if (result.removedData) {
      lines = result.lines;
      removedData = result.removedData;
      foundInSection = completedSection.name;
    }
  }

  if (!removedData) {
    throw new Error(`Todo not found in _pendientes.md: origin="${origin}" desc="${desc}"`);
  }

  // If the row came from Completados (was `done`), we need to restore deadline/created from context
  // Since completados doesn't store those, we use sensible defaults
  if (foundInSection === SECTION_NAMES.completados) {
    removedData = { ...removedData, deadline: "-", created: today };
  }

  // Build the new row based on nextState
  let newRow: string;
  if (nextState === "done") {
    newRow = buildCompletedRow(removedData, today);
  } else {
    newRow = buildActiveRow(removedData, nextState);
  }

  // Insert into target section
  const targetSection =
    nextState === "done" ? SECTION_NAMES.completados : SECTION_NAMES.porHacer;

  lines = insertRowIntoSection(lines, targetSection, newRow);

  // Reconstruct file content
  const newBody = lines.join("\n");
  const newContent = frontmatter ? `${frontmatter}${newBody}` : newBody;

  await fs.writeFile(PENDIENTES_FILE, newContent, "utf-8");
}
