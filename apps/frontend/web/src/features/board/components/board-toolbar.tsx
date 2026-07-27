import type { ReactNode } from "react";
import { Calendar, List, Search, Settings2, SlidersHorizontal, SquareKanban } from "lucide-react";

type BoardToolbarProps = {
  visibleCount: number;
  totalCount: number;
  query: string;
  onQueryChange: (query: string) => void;
};

export function BoardToolbar({ visibleCount, totalCount, query, onQueryChange }: BoardToolbarProps) {
  return (
    <div className="flex min-h-[74px] flex-col border-b border-[var(--color-border)] bg-white px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-8">
      <div
        className="scrollbar-soft flex w-full min-w-0 items-center gap-1 overflow-x-auto lg:w-auto"
        aria-label="Board view controls"
      >
        <ToolbarTab icon={<List size={18} />} label="List" unavailable />
        <ToolbarTab active icon={<SquareKanban size={18} />} label="Board" />
        <ToolbarTab icon={<Calendar size={18} />} label="Calendar" unavailable />
        <button
          type="button"
          disabled
          className="ml-3 hidden items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-muted)] lg:inline-flex"
          aria-label="Add view unavailable"
        >
          <span aria-hidden="true">+</span>
          Add
        </button>
      </div>
      <div className="flex w-full min-w-0 items-center gap-3 border-t border-[var(--color-border)] py-3 lg:flex-1 lg:justify-end lg:border-t-0 lg:py-0">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-transparent px-2 text-sm text-[var(--color-muted)] focus-within:border-[var(--color-active-purple)] lg:max-w-[280px]">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Search cards</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
          />
        </label>
        <div className="hidden items-center gap-2 text-sm text-[var(--color-muted)] sm:flex" aria-live="polite">
          <SlidersHorizontal aria-hidden="true" size={17} />
          Show
          <span className="font-semibold text-[var(--color-text)]">
            {visibleCount} of {totalCount}
          </span>
        </div>
        <button
          type="button"
          disabled
          className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-muted)] lg:inline-flex"
          aria-label="Customize unavailable"
        >
          <Settings2 aria-hidden="true" size={18} />
          Customize
        </button>
      </div>
    </div>
  );
}

type ToolbarTabProps = {
  active?: boolean;
  icon: ReactNode;
  label: string;
  unavailable?: boolean;
};

function ToolbarTab({ active = false, icon, label, unavailable = false }: ToolbarTabProps) {
  return (
    <button
      type="button"
      disabled={unavailable}
      aria-current={active ? "page" : undefined}
      aria-label={unavailable ? `${label} view unavailable` : `${label} view`}
      className={[
        "relative inline-flex h-14 shrink-0 items-center gap-2 px-3 text-base lg:h-[74px]",
        active ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-muted)]",
        unavailable ? "cursor-not-allowed opacity-60" : "hover:bg-[var(--color-toolbar-hover)]",
      ].join(" ")}
    >
      {icon}
      {label}
      {active ? (
        <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t bg-[var(--color-active-purple)]" />
      ) : null}
    </button>
  );
}
