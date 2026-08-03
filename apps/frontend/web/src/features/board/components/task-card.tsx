import type { ReactNode } from "react";
import type { BoardCard } from "@kanban/types";
import {
  CalendarDays,
  ChevronDown,
  Flag,
  GripVertical,
  Link2,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  Paperclip,
  Users,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { classNames } from "@/lib/class-names";

type TaskCardProps = {
  card: BoardCard;
  highlighted?: boolean;
  onEdit: (card: BoardCard) => void;
  onMove: (cardId: string, direction: "left" | "right" | "up" | "down") => void;
};

export function TaskCard({ card, highlighted = false, onEdit, onMove }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", cardId: card.id },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={classNames(
        "group shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)]",
        isDragging && "opacity-60 ring-2 ring-[var(--color-active-purple)]",
        highlighted &&
          "ring-2 ring-[var(--color-active-purple)] shadow-[0_0_0_4px_var(--color-active-purple-bg),0_8px_24px_rgba(32,32,32,0.08)]",
      )}
      data-ai-highlighted={highlighted ? "true" : undefined}
    >
      {card.coverVariant !== "none" ? <CardCover variant={card.coverVariant} /> : null}
      <div className="p-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left text-[17px] font-semibold leading-snug text-[var(--color-text)] hover:text-[var(--color-active-purple)]"
            onClick={() => onEdit(card)}
          >
            {card.title}
          </button>
          <button
            type="button"
            className="rounded p-1 text-[var(--color-muted)] opacity-0 hover:bg-[var(--color-card-hover)] focus:opacity-100 group-hover:opacity-100"
            aria-label={`Drag ${card.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="mt-4 flex min-h-7 flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
          {card.assigneeInitials.length > 0 ? (
            <div className="flex -space-x-2" aria-label={`${card.assigneeInitials.length} assignees`}>
              {card.assigneeInitials.map((initials, index) => (
                <span
                  key={`${card.id}-${initials}`}
                  className="grid size-7 place-items-center rounded-full border-2 border-white bg-[var(--color-active-purple-bg)] text-[10px] font-bold text-[var(--color-active-purple)]"
                  style={{ zIndex: card.assigneeInitials.length - index }}
                >
                  {initials}
                </span>
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden="true" size={17} />
              <span className="sr-only">No assignees</span>
            </span>
          )}
          {card.dueDate ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" size={17} />
              {formatDueDate(card.dueDate)}
            </span>
          ) : null}
          {card.flagged ? <Flag aria-label="Flagged" size={17} /> : null}
          {card.attachmentCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Paperclip aria-hidden="true" size={17} />
              {card.attachmentCount}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-2">
          <Link2 aria-hidden="true" size={16} />
          {card.subtaskCount > 0 ? `${card.subtaskCount} subtasks` : "No subtasks"}
          <ChevronDown aria-hidden="true" size={15} />
        </span>
        <div className="flex items-center gap-0.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
          <MoveButton label={`Move ${card.title} left`} onClick={() => onMove(card.id, "left")} icon={<MoveLeft size={15} />} />
          <MoveButton label={`Move ${card.title} up`} onClick={() => onMove(card.id, "up")} icon={<MoveUp size={15} />} />
          <MoveButton label={`Move ${card.title} down`} onClick={() => onMove(card.id, "down")} icon={<MoveDown size={15} />} />
          <MoveButton label={`Move ${card.title} right`} onClick={() => onMove(card.id, "right")} icon={<MoveRight size={15} />} />
        </div>
      </div>
    </article>
  );
}

type MoveButtonProps = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

function MoveButton({ icon, label, onClick }: MoveButtonProps) {
  return (
    <button type="button" onClick={onClick} className="rounded p-1 hover:bg-[var(--color-card-hover)]" aria-label={label}>
      {icon}
    </button>
  );
}

function CardCover({ variant }: { variant: BoardCard["coverVariant"] }) {
  const classes = {
    "soft-gradient": "bg-[linear-gradient(135deg,var(--color-active-purple-bg),var(--color-progress-bg),var(--color-closed-bg))]",
    shadow: "bg-[url('/covers/shadow.svg')]",
    waves: "bg-[url('/covers/waves.svg')]",
    none: "",
  } satisfies Record<BoardCard["coverVariant"], string>;

  return <div aria-hidden="true" className={`h-28 bg-cover bg-center ${classes[variant]}`} />;
}

function formatDueDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
