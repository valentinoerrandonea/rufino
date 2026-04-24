import type { ReactNode } from "react";
import { fmtDate } from "@/components/atoms";

// Inline tokens: **bold**, *italic*, `code`, [text](url), [[wikilink]]
function renderInline(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)]+)\)|\[\[([^\]]+)\]\])/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    if (m[2]) {
      tokens.push(<strong key={m.index}>{m[2]}</strong>);
    } else if (m[3]) {
      tokens.push(<em key={m.index}>{m[3]}</em>);
    } else if (m[4]) {
      tokens.push(
        <code
          key={m.index}
          style={{
            fontFamily: "monospace",
            fontSize: "0.88em",
            background: "var(--surface)",
            border: "1px solid var(--hair-soft)",
            borderRadius: 4,
            padding: "1px 5px",
            color: "var(--ink)",
          }}
        >
          {m[4]}
        </code>
      );
    } else if (m[5] && m[6]) {
      tokens.push(
        <a
          key={m.index}
          href={m[6]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid currentColor" }}
        >
          {m[5]}
        </a>
      );
    } else if (m[7]) {
      tokens.push(
        <span
          key={m.index}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--hair)",
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: "0.9em",
            color: "var(--ink-2)",
          }}
        >
          {m[7]}
        </span>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

type Block =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "hr" };

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings
    const h4 = line.match(/^####\s+(.*)/);
    if (h4) { blocks.push({ type: "h4", text: h4[1].trim() }); i++; continue; }
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) { blocks.push({ type: "h3", text: h3[1].trim() }); i++; continue; }
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) { blocks.push({ type: "h2", text: h2[1].trim() }); i++; continue; }
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) { blocks.push({ type: "h1", text: h1[1].trim() }); i++; continue; }

    // Table
    if (line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].match(/^\|[-| ]+\|/)) {
      const parseCells = (l: string) =>
        l.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const header = parseCells(line);
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseCells(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].slice(1).trim());
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].startsWith(">") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "p", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

function renderBlock(block: Block, idx: number): ReactNode {
  switch (block.type) {
    case "h1":
      return (
        <h1 key={idx} className="serif" style={{ fontSize: 28, fontWeight: 400, margin: "0 0 12px", letterSpacing: -0.3, color: "var(--accent)" }}>
          {renderInline(block.text)}
        </h1>
      );
    case "h2":
      return (
        <h2 key={idx} className="serif" style={{ fontSize: 20, fontWeight: 500, margin: "32px 0 10px", letterSpacing: -0.2, color: "var(--accent)" }}>
          {renderInline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3 key={idx} className="serif" style={{ fontSize: 17, fontWeight: 500, margin: "24px 0 8px", letterSpacing: -0.1, color: "var(--accent)" }}>
          {renderInline(block.text)}
        </h3>
      );
    case "h4":
      return (
        <h4 key={idx} style={{ fontSize: 13, fontWeight: 600, margin: "20px 0 6px", textTransform: "uppercase", letterSpacing: 0.6, color: "var(--ink-2)" }}>
          {renderInline(block.text)}
        </h4>
      );
    case "p":
      return (
        <p key={idx} style={{ margin: "0 0 16px", lineHeight: 1.75 }}>
          {renderInline(block.text)}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} style={{ margin: "0 0 16px", paddingLeft: 22 }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ marginBottom: 5, lineHeight: 1.65 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} style={{ margin: "0 0 16px", paddingLeft: 22 }}>
          {block.items.map((item, j) => (
            <li key={j} style={{ marginBottom: 5, lineHeight: 1.65 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote
          key={idx}
          style={{
            margin: "0 0 16px",
            paddingLeft: 16,
            borderLeft: "3px solid var(--accent)",
            color: "var(--ink-2)",
            fontStyle: "italic",
          }}
        >
          {renderInline(block.text)}
        </blockquote>
      );
    case "table":
      return (
        <div key={idx} style={{ overflowX: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                {block.header.map((h, j) => (
                  <th
                    key={j}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "2px solid var(--hair)",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "var(--ink-2)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j} style={{ borderBottom: "1px solid var(--hair-soft)" }}>
                  {row.map((cell, k) => (
                    <td key={k} style={{ padding: "8px 12px", color: "var(--ink)", lineHeight: 1.55 }}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "hr":
      return <hr key={idx} style={{ border: "none", borderTop: "1px solid var(--hair)", margin: "24px 0" }} />;
  }
}

interface FrontmatterMeta {
  created?: string;
  updated?: string;
  tags?: string[];
}

interface MemoryMarkdownProps {
  content: string;
  meta?: FrontmatterMeta;
  /** Strip the first h1 (use when title is shown separately) */
  stripTitle?: boolean;
}

export function MemoryMarkdown({ content, meta, stripTitle = false }: MemoryMarkdownProps) {
  let md = content;
  if (stripTitle) {
    md = md.replace(/^#\s+.+\n?/, "").trimStart();
  }

  const blocks = parseBlocks(md);

  return (
    <div>
      {meta && (meta.created || meta.updated || (meta.tags && meta.tags.length > 0)) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 28,
            paddingBottom: 16,
            borderBottom: "1px solid var(--hair-soft)",
          }}
        >
          {meta.updated && (
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              Actualizado {fmtDate(meta.updated)}
            </span>
          )}
          {meta.created && (
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
              Creado {fmtDate(meta.created)}
            </span>
          )}
          {meta.tags &&
            meta.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10.5,
                  color: "var(--accent)",
                  background: "var(--accent-wash)",
                  border: "1px solid var(--accent-wash)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {tag}
              </span>
            ))}
        </div>
      )}
      <article style={{ fontSize: 15, lineHeight: 1.75, color: "var(--ink)" }}>
        {blocks.map((b, i) => renderBlock(b, i))}
      </article>
    </div>
  );
}
