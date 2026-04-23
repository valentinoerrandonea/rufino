"use client";

import { useOptimistic, useTransition } from "react";
import { toggleTodoState } from "@/app/actions";

type TodoState = "todo" | "progress" | "done";

const NEXT_STATE: Record<TodoState, TodoState> = {
  todo: "progress",
  progress: "done",
  done: "todo",
};

const CB_MARK: Record<TodoState, string> = {
  todo: "",
  progress: "·",
  done: "✓",
};

const CB_CLASS: Record<TodoState, string> = {
  todo: "cb",
  progress: "cb progress",
  done: "cb done",
};

interface TodoCheckboxProps {
  origin: string;
  desc: string;
  currentState: TodoState;
}

export function TodoCheckbox({ origin, desc, currentState }: TodoCheckboxProps) {
  // useOptimistic auto-syncs with the prop after the transition resolves.
  const [optimistic, setOptimistic] = useOptimistic(
    currentState,
    (_: TodoState, next: TodoState) => next
  );
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = NEXT_STATE[optimistic];
    startTransition(async () => {
      setOptimistic(next);
      await toggleTodoState({
        origin,
        desc,
        currentState: optimistic,
        nextState: next,
      });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={`Marcar como ${NEXT_STATE[optimistic]}`}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: isPending ? "wait" : "pointer",
        display: "flex",
      }}
    >
      <div
        className={CB_CLASS[optimistic]}
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        <span className="cb-mark">{CB_MARK[optimistic]}</span>
      </div>
    </button>
  );
}
