"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTodoState } from "@/app/actions";

type TodoState = "todo" | "done";

interface TodoCheckboxProps {
  origin: string;
  desc: string;
  currentState: TodoState;
  /**
   * When true, marking-as-done holds the optimistic ✓ on screen for a few
   * seconds before triggering router.refresh, so the user sees confirmation
   * before the row jumps to the Completados section.
   */
  holdOnDone?: boolean;
}

const HOLD_MS = 2500;

export function TodoCheckbox({
  origin,
  desc,
  currentState,
  holdOnDone = false,
}: TodoCheckboxProps) {
  const [optimistic, setOptimistic] = useOptimistic(
    currentState,
    (_: TodoState, next: TodoState) => next
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next: TodoState = optimistic === "todo" ? "done" : "todo";
    startTransition(async () => {
      setOptimistic(next);
      await toggleTodoState({
        origin,
        desc,
        currentState: optimistic,
        nextState: next,
      });
      if (holdOnDone && next === "done") {
        await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
      }
      router.refresh();
    });
  };

  const cls = optimistic === "done" ? "cb done" : "cb";
  const mark = optimistic === "done" ? "✓" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={`Marcar como ${optimistic === "todo" ? "done" : "todo"}`}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: isPending ? "wait" : "pointer",
        display: "flex",
      }}
    >
      <div className={cls} style={{ opacity: isPending ? 0.85 : 1 }}>
        <span className="cb-mark">{mark}</span>
      </div>
    </button>
  );
}
