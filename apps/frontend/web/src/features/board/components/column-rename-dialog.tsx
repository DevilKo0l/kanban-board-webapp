import { useState } from "react";
import type { BoardColumn } from "@kanban/types";
import { X } from "lucide-react";

type ColumnRenameDialogProps = {
  column: BoardColumn;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
  submitting: boolean;
};

export function ColumnRenameDialog({
  column,
  error,
  onClose,
  onSubmit,
  submitting,
}: ColumnRenameDialogProps) {
  const [name, setName] = useState(column.name);
  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/25 px-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="column-rename-title"
        className="w-full max-w-[420px] rounded-lg border border-[var(--color-border)] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="column-rename-title" className="text-lg font-semibold">
              Rename column
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Fixed status: {column.statusKey.replaceAll("_", " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 hover:bg-[var(--color-card-hover)]"
            aria-label="Close rename dialog"
            disabled={submitting}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              onSubmit(name);
            }
          }}
        >
          <label className="block text-sm font-medium">
            Column name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2"
              autoFocus
              disabled={submitting}
            />
          </label>
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-semibold text-[var(--color-muted)]"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-[var(--color-active-purple)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? "Saving..." : "Save name"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
