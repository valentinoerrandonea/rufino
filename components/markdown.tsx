import Link from "next/link";
import type { ReactNode } from "react";

// Normalize a wikilink name to a URL-safe id
function normalizeId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

// Escape HTML special characters to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface InlineToken {
  type: "bold" | "italic" | "code" | "wikilink" | "text";
  content: string;
}

// Parse inline markdown: **bold**, *italic*, `code`, [[wikilink]]
function parseInline(raw: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;

  while (i < raw.length) {
    // Bold: **...**
    if (raw[i] === "*" && raw[i + 1] === "*") {
      const end = raw.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ type: "bold", content: raw.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Italic: *...* (single)
    if (raw[i] === "*" && raw[i + 1] !== "*") {
      const end = raw.indexOf("*", i + 1);
      if (end !== -1) {
        tokens.push({ type: "italic", content: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Code: `...`
    if (raw[i] === "`") {
      const end = raw.indexOf("`", i + 1);
      if (end !== -1) {
        tokens.push({ type: "code", content: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // Wikilink: [[...]]
    if (raw[i] === "[" && raw[i + 1] === "[") {
      const end = raw.indexOf("]]", i + 2);
      if (end !== -1) {
        tokens.push({ type: "wikilink", content: raw.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // Plain text: accumulate until next special char
    let j = i + 1;
    while (j < raw.length) {
      if (
        (raw[j] === "*") ||
        (raw[j] === "`") ||
        (raw[j] === "[" && raw[j + 1] === "[")
      ) break;
      j++;
    }
    tokens.push({ type: "text", content: raw.slice(i, j) });
    i = j;
  }

  return tokens;
}

interface InlineProps {
  text: string;
  noteIds?: Set<string>;
}

function Inline({ text, noteIds }: InlineProps): ReactNode {
  const tokens = parseInline(text);
  return (
    <>
      {tokens.map((tok, idx) => {
        switch (tok.type) {
          case "bold":
            return <strong key={idx}><Inline text={tok.content} noteIds={noteIds} /></strong>;
          case "italic":
            return <em key={idx}><Inline text={tok.content} noteIds={noteIds} /></em>;
          case "code":
            return (
              <code
                key={idx}
                className="mono"
                style={{
                  fontSize: "0.85em",
                  background: "var(--surface-2)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: "1px solid var(--hair-soft)",
                }}
              >
                {tok.content}
              </code>
            );
          case "wikilink": {
            const id = normalizeId(tok.content);
            const label = tok.content;
            if (noteIds && noteIds.has(id)) {
              return (
                <Link
                  key={idx}
                  href={`/notes/${id}`}
                  style={{ color: "var(--accent)", textDecoration: "underline", textDecorationColor: "var(--accent-wash)" }}
                >
                  {label}
                </Link>
              );
            }
            return (
              <span key={idx} style={{ color: "var(--ink-2)", fontStyle: "italic" }}>
                {label}
              </span>
            );
          }
          case "text":
          default:
            return <span key={idx}>{tok.content}</span>;
        }
      })}
    </>
  );
}

interface MarkdownProps {
  content: string;
  noteIds?: Set<string>;
  /** Base font size in px, default 14 */
  fontSize?: number;
}

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "bullet"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "hr" }
  | { type: "blank" }
  | { type: "para"; text: string };

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    // Horizontal rule (---, ***, ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("#### ")) {
      blocks.push({ type: "h4", text: line.slice(5) });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: line.slice(2) });
      i++;
      continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "bullet", text: line.slice(2) });
      i++;
      continue;
    }

    // Table: row starts with |
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        // Skip separator rows like |---|---|
        if (!/^\|[-|\s:]+\|/.test(lines[i])) {
          tableLines.push(lines[i]);
        }
        i++;
      }
      const rows = tableLines.map((tl) =>
        tl
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim())
      );
      if (rows.length > 0) {
        blocks.push({ type: "table", rows });
      }
      continue;
    }

    // Paragraph
    blocks.push({ type: "para", text: line });
    i++;
  }

  return blocks;
}

export function Markdown({ content, noteIds, fontSize = 14 }: MarkdownProps) {
  const lines = content.split("\n");
  const blocks = parseBlocks(lines);

  const elements: ReactNode[] = [];
  let keyIdx = 0;

  for (const block of blocks) {
    const k = keyIdx++;

    switch (block.type) {
      case "blank":
        break;

      case "hr":
        elements.push(<hr key={k} className="hr-soft" style={{ margin: "20px 0" }} />);
        break;

      case "h1":
        elements.push(
          <h1 key={k} className="serif" style={{ fontSize: 28, fontWeight: 400, marginBottom: 12, marginTop: 24, lineHeight: 1.2 }}>
            <Inline text={block.text} noteIds={noteIds} />
          </h1>
        );
        break;

      case "h2":
        elements.push(
          <h2 key={k} className="serif" style={{ fontSize: 20, fontWeight: 500, marginBottom: 10, marginTop: 28, letterSpacing: -0.2 }}>
            <Inline text={block.text} noteIds={noteIds} />
          </h2>
        );
        break;

      case "h3":
        elements.push(
          <h3
            key={k}
            className="serif"
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "var(--ink)",
              margin: 0,
              marginBottom: 10,
              marginTop: 24,
              letterSpacing: -0.1,
            }}
          >
            <Inline text={block.text} noteIds={noteIds} />
          </h3>
        );
        break;

      case "h4":
        elements.push(
          <h4
            key={k}
            className="serif"
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: 8,
              marginTop: 18,
              letterSpacing: -0.05,
            }}
          >
            <Inline text={block.text} noteIds={noteIds} />
          </h4>
        );
        break;

      case "blockquote":
        elements.push(
          <blockquote
            key={k}
            style={{
              borderLeft: "3px solid var(--accent)",
              marginLeft: 0,
              paddingLeft: 16,
              color: "var(--ink-2)",
              fontStyle: "italic",
              fontSize,
              lineHeight: 1.6,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <Inline text={block.text} noteIds={noteIds} />
          </blockquote>
        );
        break;

      case "bullet":
        elements.push(
          <div
            key={k}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize,
              lineHeight: 1.65,
              color: "var(--ink)",
              marginTop: 3,
              marginBottom: 3,
            }}
          >
            <span style={{ color: "var(--accent)", marginTop: 2, flexShrink: 0, fontWeight: 500 }}>·</span>
            <span><Inline text={block.text} noteIds={noteIds} /></span>
          </div>
        );
        break;

      case "table": {
        const [headerRow, ...bodyRows] = block.rows;
        if (!headerRow) break;
        elements.push(
          <div key={k} style={{ overflowX: "auto", marginTop: 12, marginBottom: 12 }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: fontSize - 1,
                width: "100%",
                color: "var(--ink)",
              }}
            >
              <thead>
                <tr>
                  {headerRow.map((cell, ci) => (
                    <th
                      key={ci}
                      style={{
                        textAlign: "left",
                        padding: "6px 12px",
                        borderBottom: "1px solid var(--hair)",
                        fontWeight: 600,
                        fontSize: 11,
                        color: "var(--ink-2)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Inline text={cell} noteIds={noteIds} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: "7px 12px",
                          borderBottom: ri < bodyRows.length - 1 ? "1px solid var(--hair-soft)" : "none",
                          verticalAlign: "top",
                          lineHeight: 1.5,
                        }}
                      >
                        <Inline text={cell} noteIds={noteIds} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        break;
      }

      case "para":
      default:
        elements.push(
          <p
            key={k}
            style={{
              fontSize,
              lineHeight: 1.7,
              color: "var(--ink)",
              margin: 0,
              marginTop: 6,
              marginBottom: 6,
            }}
          >
            <Inline text={block.text} noteIds={noteIds} />
          </p>
        );
        break;
    }
  }

  return <>{elements}</>;
}
