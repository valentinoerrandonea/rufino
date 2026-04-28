"use client";

import { useEffect, useRef, useState } from "react";

interface TagDropdownProps {
  /** All available tags (format: "proyecto/arista" or just "proyecto") */
  tags: string[];
  /** The current filter text */
  query: string;
  /** Called when user selects a tag */
  onSelect: (tag: string) => void;
  /** Called when dropdown should close without selection */
  onClose: () => void;
}

export function TagDropdown({
  tags,
  query,
  onSelect,
  onClose,
}: TagDropdownProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = tags
    .filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

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
        maxHeight: 280,
        overflowY: "auto",
        top: "100%",
        left: 0,
      }}
    >
      {filtered.map((tag, i) => {
        const [project, arista] = tag.split("/");
        return (
          <li
            key={tag}
            role="option"
            aria-selected={i === activeIdx}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(tag);
            }}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: "var(--ink)",
              background: i === activeIdx ? "var(--accent-wash)" : "transparent",
              borderLeft: i === activeIdx ? "2px solid var(--accent)" : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>{project}</span>
            {arista && (
              <>
                <span style={{ color: "var(--ink-3)" }}>/</span>
                <span style={{ color: "var(--ink-2)" }}>{arista}</span>
              </>
            )}
          </li>
        );
      })}
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
          Usar &quot;{query}&quot; (freetext)
        </li>
      )}
    </ul>
  );
}
