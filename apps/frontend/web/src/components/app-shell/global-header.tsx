import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  Circle,
  Grid3X3,
  PlusCircle,
  Search,
} from "lucide-react";

type GlobalHeaderProps = {
  onOpenAi: () => void;
};

export function GlobalHeader({ onOpenAi }: GlobalHeaderProps) {
  return (
    <header className="flex h-[50px] items-center gap-4 bg-[var(--color-header)] px-5 text-white">
      <div className="flex items-center gap-2 text-[var(--color-header-control)]" aria-label="Window controls">
        <Circle aria-hidden="true" size={14} strokeWidth={1.5} />
        <Circle aria-hidden="true" size={14} strokeWidth={1.5} />
        <Circle aria-hidden="true" size={14} strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-2 text-[var(--color-header-muted)]">
        <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Back unavailable" disabled>
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <button
          type="button"
          className="rounded p-1 text-white/35"
          aria-label="Forward unavailable"
          disabled
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
      <label className="mx-auto flex h-9 w-full max-w-[630px] items-center gap-2 rounded-md bg-white/10 px-4 text-[var(--color-header-search)]">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">Global search unavailable</span>
        <input
          disabled
          placeholder="Search..."
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[var(--color-header-search)] outline-none disabled:cursor-not-allowed"
        />
      </label>
      <button
        type="button"
        onClick={onOpenAi}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-ai-button)] px-3 text-sm font-semibold shadow-sm hover:bg-[var(--color-ai-button-hover)]"
        aria-label="Open AI assistant preview"
      >
        <Bot aria-hidden="true" size={16} />
        AI
      </button>
      <button
        type="button"
        className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-white/10 sm:inline-flex"
        disabled
        aria-label="New item unavailable"
      >
        <PlusCircle aria-hidden="true" size={17} />
        New
      </button>
      <button type="button" className="rounded p-1.5 hover:bg-white/10" aria-label="Apps unavailable" disabled>
        <Grid3X3 aria-hidden="true" size={18} />
      </button>
      <button type="button" className="rounded p-1.5 hover:bg-white/10" aria-label="Notifications unavailable" disabled>
        <Bell aria-hidden="true" size={18} />
      </button>
      <div className="grid size-8 place-items-center rounded-full bg-[var(--color-active-purple)] text-xs font-bold">
        U
      </div>
    </header>
  );
}
