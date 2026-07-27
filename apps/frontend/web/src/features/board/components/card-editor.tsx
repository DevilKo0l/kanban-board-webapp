import { useState } from "react";
import type { BoardCard } from "@kanban/types";
import { X } from "lucide-react";

import type { CardDraft } from "@/features/board/lib/board-operations";

type CardEditorProps = {
  card?: BoardCard;
  columnName: string;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (draft: CardDraft) => void;
};

export function CardEditor({ card, columnName, mode, onClose, onSubmit }: CardEditorProps) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [dueDate, setDueDate] = useState(card?.dueDate ?? "");

  const canSubmit = title.trim().length > 0;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/25 px-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-editor-title"
        className="w-full max-w-[520px] rounded-lg border border-[var(--color-border)] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="card-editor-title" className="text-lg font-semibold">
              {mode === "create" ? "Create task" : "Edit task"}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">{columnName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-[var(--color-card-hover)]" aria-label="Close editor">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              onSubmit({
                title,
                ...(description.trim() ? { description } : {}),
                ...(dueDate ? { dueDate } : {}),
              });
            }
          }}
        >
          <label className="block text-sm font-medium">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={600}
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-[var(--color-border)] px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-semibold text-[var(--color-muted)]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-[var(--color-active-purple)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {mode === "create" ? "Create task" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
