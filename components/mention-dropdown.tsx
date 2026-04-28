"use client";

import { useEffect, useRef, useState } from "react";

interface MentionDropdownProps {
  /** All available mentionables (people names + project ids) */
  suggestions: string[];
  /** The current query after "@" */
  query: string;
  /** Called when user selects a suggestion */
  onSelect: (value: string) => void;
  /** Called when dropdown should close without selection */
  onClose: () => void;
}

export function MentionDropdown({
  suggestions,
  query,
  onSelect,
  onClose,
}: MentionDropdownProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[activeIdx]) {
          onSelect(filtered[activeIdx]);
        } else if (query) {
          // freetext fallback
          onSelect(query);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filtered, activeIdx, query, onSelect, onClose]);

  if (filtered.length === 0 && !query) return null;

  return (
    <ul
      ref={listRef}
      role="listbox"
      style={{
        position: "absolute",
        zIndex: 100,
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        margin: 0,
        padding: "4px 0",
        listStyle: "none",
        minWidth: 200,
        maxWidth: 320,
        maxHeight: 240,
        overflowY: "auto",
        top: "100%",
        left: 0,
      }}
    >
      {filtered.map((s, i) => (
        <li
          key={s}
          role="option"
          aria-selected={i === activeIdx}
          onMouseEnter={() => setActiveIdx(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
          style={{
            padding: "7px 14px",
            fontSize: 13,
            cursor: "pointer",
            color: "var(--ink)",
            background: i === activeIdx ? "var(--accent-wash)" : "transparent",
            borderLeft: i === activeIdx ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          @{s}
        </li>
      ))}
      {filtered.length === 0 && query && (
        <li
          role="option"
          aria-selected={false}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(query);
          }}
          style={{
            padding: "7px 14px",
            fontSize: 13,
            cursor: "pointer",
            color: "var(--ink-2)",
            fontStyle: "italic",
          }}
        >
          Usar &quot;@{query}&quot; (freetext)
        </li>
      )}
    </ul>
  );
}

/**
 * Detect if a text value contains an active @mention query.
 * Returns { active: true, query: string, atIndex: number } when the cursor
 * is inside an @<word> that has not yet been completed (no space after @).
 */
export function detectMention(value: string): { active: true; query: string; atIndex: number } | { active: false } {
  const lastAt = value.lastIndexOf("@");
  if (lastAt === -1) return { active: false };

  const afterAt = value.slice(lastAt + 1);
  // Active while there's no whitespace after the @
  if (afterAt.includes(" ") || afterAt.includes("\n")) return { active: false };

  return { active: true, query: afterAt, atIndex: lastAt };
}

/**
 * Apply a selected @mention to an existing value, replacing the @<query> segment.
 */
export function applyMention(value: string, atIndex: number, query: string, selected: string): string {
  const before = value.slice(0, atIndex);
  const after = value.slice(atIndex + 1 + query.length);
  return `${before}@${selected} ${after}`;
}
