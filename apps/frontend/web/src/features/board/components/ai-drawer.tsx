import { Bot, X } from "lucide-react";

type AiDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function AiDrawer({ open, onClose }: AiDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <aside
      className="fixed right-0 top-[50px] z-30 h-[calc(100vh-50px)] w-full max-w-[360px] border-l border-[var(--color-border)] bg-white shadow-2xl"
      aria-label="AI assistant preview drawer"
    >
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-[var(--color-active-purple-bg)] text-[var(--color-active-purple)]">
            <Bot aria-hidden="true" size={17} />
          </span>
          AI assistant
        </div>
        <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-[var(--color-card-hover)]" aria-label="Close AI drawer">
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-message-bg)] p-3 text-[var(--color-muted)]">
          AI chat is planned for a later phase. The drawer is here to verify the shell can open without
          losing board context.
        </p>
        <textarea
          disabled
          aria-label="AI message unavailable"
          placeholder="AI messages are unavailable in this phase"
          className="h-28 w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-message-bg)] p-3 text-sm"
        />
      </div>
    </aside>
  );
}
