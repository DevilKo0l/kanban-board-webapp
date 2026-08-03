import type { FormEvent } from "react";
import { AlertCircle, Bot, CheckCircle2, Loader2, Send, X } from "lucide-react";

import { classNames } from "@/lib/class-names";

export type AiDrawerMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type AiDrawerProps = {
  draft: string;
  error: string | null;
  lastActionSummary: string | null;
  messages: AiDrawerMessage[];
  open: boolean;
  sending: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
};

export function AiDrawer({
  draft,
  error,
  lastActionSummary,
  messages,
  open,
  sending,
  onClose,
  onDraftChange,
  onSubmit,
}: AiDrawerProps) {
  if (!open) {
    return null;
  }

  const canSubmit = draft.trim().length > 0 && !sending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <aside
      className="fixed right-0 top-[50px] z-30 flex h-[calc(100vh-50px)] w-full max-w-[390px] flex-col border-l border-[var(--color-border)] bg-white shadow-2xl sm:max-w-[380px]"
      aria-label="AI assistant drawer"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-[var(--color-active-purple-bg)] text-[var(--color-active-purple)]">
            <Bot aria-hidden="true" size={17} />
          </span>
          AI assistant
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 hover:bg-[var(--color-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-active-purple)]"
          aria-label="Close AI drawer"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="scrollbar-soft flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-message-bg)] p-3 text-sm text-[var(--color-muted)]">
            Ask the assistant to summarize the board or create, edit, and move tasks. Board changes are validated by the backend before they appear here.
          </div>
        ) : (
          <ol className="space-y-3" aria-label="AI conversation">
            {messages.map((message) => (
              <li
                key={message.id}
                className={classNames(
                  "rounded-md border p-3 text-sm leading-6",
                  message.role === "user"
                    ? "ml-8 border-[var(--color-active-purple)] bg-[var(--color-active-purple-bg)] text-[var(--color-text)]"
                    : "mr-8 border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-[var(--shadow-card)]",
                )}
              >
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  {message.role === "user" ? "You" : "Assistant"}
                </span>
                <span className="whitespace-pre-wrap">{message.content}</span>
              </li>
            ))}
          </ol>
        )}

        {sending ? (
          <div
            className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-message-bg)] p-3 text-sm text-[var(--color-muted)]"
            role="status"
            aria-live="polite"
          >
            <Loader2 aria-hidden="true" size={16} className="animate-spin" />
            Waiting for the assistant...
          </div>
        ) : null}

        {lastActionSummary ? (
          <div
            className="flex items-start gap-2 rounded-md border border-[var(--color-active-purple)] bg-[var(--color-active-purple-bg)] p-3 text-sm text-[var(--color-active-purple)]"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            <span>{lastActionSummary}</span>
          </div>
        ) : null}

        {error ? (
          <div
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <form className="shrink-0 border-t border-[var(--color-border)] p-4" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="ai-message">
          AI message
        </label>
        <textarea
          id="ai-message"
          aria-label="AI message"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ask the assistant to update the board..."
          className="h-24 w-full resize-none rounded-md border border-[var(--color-border)] bg-white p-3 text-sm outline-none placeholder:text-[var(--color-muted)] focus:border-[var(--color-active-purple)] focus:ring-2 focus:ring-[var(--color-active-purple-bg)] disabled:cursor-not-allowed disabled:bg-[var(--color-message-bg)]"
          disabled={sending}
          maxLength={2000}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-muted)]">{draft.length}/2000</p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-active-purple)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--color-todo-label)] disabled:text-[var(--color-muted)]"
            aria-label="Send AI message"
          >
            <Send aria-hidden="true" size={16} />
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
