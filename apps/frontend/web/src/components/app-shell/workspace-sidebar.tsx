import type { ReactNode } from "react";
import { ChevronDown, Home, Inbox, MoreHorizontal, Plus } from "lucide-react";

const spaces = [
  { label: "Launch", initials: "L", color: "bg-[var(--color-space-launch)]", selected: true },
  { label: "Product", initials: "P", color: "bg-[var(--color-space-product)]", selected: false },
  { label: "Engineering", initials: "E", color: "bg-[var(--color-space-engineering)]", selected: false },
  { label: "Design", initials: "D", color: "bg-[var(--color-space-design)]", selected: false },
  { label: "Finance", initials: "F", color: "bg-[var(--color-space-finance)]", selected: false },
];

export function WorkspaceSidebar() {
  return (
    <aside className="hidden w-[252px] shrink-0 border-r border-[var(--color-border)] bg-white md:block">
      <div className="flex h-[74px] items-center gap-3 border-b border-[var(--color-border)] px-5">
        <div className="grid size-8 place-items-center rounded-md bg-[var(--color-logo-bg)] text-sm font-bold text-[var(--color-logo-text)]">
          K
        </div>
        <button type="button" className="flex min-w-0 items-center gap-1 text-left" aria-label="Workspace menu unavailable" disabled>
          <span className="truncate text-base font-semibold">Project Hub</span>
          <ChevronDown aria-hidden="true" size={16} className="text-[var(--color-muted)]" />
        </button>
      </div>
      <nav className="px-4 py-6" aria-label="Workspace navigation">
        <div className="space-y-1">
          <SidebarItem icon={<Home size={20} />} label="Home" unavailable />
          <SidebarItem badge="9" icon={<Inbox size={20} />} label="Inbox" unavailable />
          <SidebarItem icon={<MoreHorizontal size={20} />} label="More" unavailable />
        </div>
        <div className="mt-10">
          <div className="px-1 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
            Spaces
          </div>
          <div className="mt-4 space-y-1">
            {spaces.map((space) => (
              <button
                key={space.label}
                type="button"
                disabled={!space.selected}
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  space.selected
                    ? "bg-[var(--color-active-purple-bg)] font-semibold text-[var(--color-active-purple)]"
                    : "text-[var(--color-text)] opacity-75",
                ].join(" ")}
                aria-label={space.selected ? "Selected board space" : `${space.label} space unavailable`}
              >
                <span className={`grid size-7 place-items-center rounded-md text-xs font-bold text-white ${space.color}`}>
                  {space.initials}
                </span>
                <span>{space.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled
            className="mt-6 flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-muted)]"
            aria-label="Add space unavailable"
          >
            <Plus aria-hidden="true" size={18} />
            Add Space
          </button>
        </div>
      </nav>
    </aside>
  );
}

type SidebarItemProps = {
  badge?: string;
  icon: ReactNode;
  label: string;
  unavailable?: boolean;
};

function SidebarItem({ badge, icon, label, unavailable = false }: SidebarItemProps) {
  return (
    <button
      type="button"
      disabled={unavailable}
      className="flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left text-base text-[var(--color-text)] opacity-75"
      aria-label={`${label} unavailable`}
    >
      <span className="text-[var(--color-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="grid min-w-7 place-items-center rounded-full bg-[var(--color-inbox-badge)] px-2 py-0.5 text-xs font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
