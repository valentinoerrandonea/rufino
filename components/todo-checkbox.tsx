"use client";

import { useTransition, useState } from "react";
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
  const [optimisticState, setOptimisticState] = useState<TodoState>(currentState);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const next = NEXT_STATE[optimisticState];
    setOptimisticState(next);

    startTransition(async () => {
      try {
        await toggleTodoState({ origin, desc, currentState: optimisticState, nextState: next });
      } catch {
        // Revert optimistic update on error
        setOptimisticState(optimisticState);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={`Marcar como ${NEXT_STATE[optimisticState]}`}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
    >
      <div className={CB_CLASS[optimisticState]} style={{ opacity: isPending ? 0.6 : 1 }}>
        <span className="cb-mark">{CB_MARK[optimisticState]}</span>
      </div>
    </button>
  );
}
