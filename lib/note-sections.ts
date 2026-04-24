export type EditableKey =
  | "resumen"
  | "analisis"
  | "implicaciones"
  | "preguntas"
  | "followups";

export interface ParsedNote {
  title: string;
  rawBody: string;
  resumen: string;
  analisis: string;
  implicaciones: string;
  preguntas: string;
  followups: string;
  /** Raw header lines as they appear in the source, used for surgical replace on save */
  headers: Partial<Record<EditableKey, string>>;
}

export interface NoteUpdates {
  rawBody: string;
  resumen: string;
  analisis: string;
  implicaciones: string;
  preguntas: string;
  followups: string;
}

const EDITABLE_TITLES: Record<EditableKey, string[]> = {
  resumen: ["resumen estructurado", "resumen"],
  analisis: ["analisis", "analysis"],
  implicaciones: ["implicaciones", "implications"],
  preguntas: ["preguntas abiertas", "open questions"],
  followups: ["suggested follow-ups", "proximos pasos", "next steps", "follow-ups"],
};

const STANDARD_HEADER: Record<EditableKey, string> = {
  resumen: "### Resumen estructurado",
  analisis: "### Analisis",
  implicaciones: "### Implicaciones",
  preguntas: "### Preguntas abiertas",
  followups: "### Suggested follow-ups",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function matchEditableKey(title: string): EditableKey | null {
  const n = normalize(title);
  for (const key of Object.keys(EDITABLE_TITLES) as EditableKey[]) {
    if (EDITABLE_TITLES[key].some((v) => normalize(v) === n)) return key;
  }
  return null;
}

type HeaderInfo = { start: number; end: number; raw: string; title: string };

function findAllHeaders(body: string): HeaderInfo[] {
  const out: HeaderInfo[] = [];
  const lines = body.split("\n");
  let offset = 0;
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      out.push({
        start: offset,
        end: offset + line.length,
        raw: line,
        title: m[2].trim(),
      });
    }
    offset += line.length + 1;
  }
  return out;
}

export function parseNote(md: string): ParsedNote {
  const fmMatch = md.match(/^---\n[\s\S]*?\n---\n/);
  const body = fmMatch ? md.slice(fmMatch[0].length) : md;

  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const afterTitleStart =
    titleMatch && titleMatch.index !== undefined
      ? titleMatch.index + titleMatch[0].length
      : 0;
  const afterTitle = body.slice(afterTitleStart);

  const rawEnds = [
    afterTitle.search(/\n---\s*\n/),
    afterTitle.search(/\n##\s/),
  ].filter((i) => i !== -1);
  const rawEnd = rawEnds.length ? Math.min(...rawEnds) : afterTitle.length;
  const rawBody = afterTitle.slice(0, rawEnd).trim();

  const hs = findAllHeaders(body);
  const sections: Partial<Record<EditableKey, string>> = {};
  const headers: Partial<Record<EditableKey, string>> = {};
  for (let i = 0; i < hs.length; i++) {
    const cur = hs[i];
    const key = matchEditableKey(cur.title);
    if (!key) continue;
    const nxt = hs[i + 1];
    const contentEnd = nxt ? nxt.start : body.length;
    sections[key] = body.slice(cur.end, contentEnd).trim();
    headers[key] = cur.raw;
  }

  return {
    title,
    rawBody,
    resumen: sections.resumen ?? "",
    analisis: sections.analisis ?? "",
    implicaciones: sections.implicaciones ?? "",
    preguntas: sections.preguntas ?? "",
    followups: sections.followups ?? "",
    headers,
  };
}

const EDITABLE_KEYS: EditableKey[] = [
  "resumen",
  "analisis",
  "implicaciones",
  "preguntas",
  "followups",
];

export function serializeNote(
  original: string,
  parsed: ParsedNote,
  updates: NoteUpdates
): string {
  let md = original;

  for (const key of EDITABLE_KEYS) {
    const rawHeader = parsed.headers[key];
    const newContent = updates[key].trim();

    if (rawHeader) {
      const idx = md.indexOf(rawHeader);
      if (idx === -1) continue;
      const after = idx + rawHeader.length;
      const rest = md.slice(after);
      const nextH = rest.search(/\n#{2,3}\s/);
      const end = nextH === -1 ? md.length : after + nextH;
      const before = md.slice(0, after);
      const tail = md.slice(end).replace(/^\n+/, "");
      const insert = newContent ? `\n\n${newContent}\n\n` : "\n\n";
      md = before + insert + tail;
    } else if (newContent) {
      md = md.replace(/\s*$/, "") + `\n\n${STANDARD_HEADER[key]}\n\n${newContent}\n`;
    }
  }

  const titleMatch = md.match(/^#\s+.+$/m);
  if (titleMatch && titleMatch.index !== undefined) {
    const after = titleMatch.index + titleMatch[0].length;
    const rest = md.slice(after);
    const rawEnds = [rest.search(/\n---\s*\n/), rest.search(/\n##\s/)].filter(
      (i) => i !== -1
    );
    const endRel = rawEnds.length ? Math.min(...rawEnds) : rest.length;
    const newBody = updates.rawBody.trim();
    const before = md.slice(0, after);
    const tail = md.slice(after + endRel).replace(/^\n+/, "\n");
    md = before + `\n\n${newBody}\n` + tail;
  }

  return md;
}
