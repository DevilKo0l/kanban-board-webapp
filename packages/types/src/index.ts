export type ApiStatus = {
  name: string;
  version: string;
  apiPrefix: string;
};

export type HealthStatus = {
  status: "ok";
  appEnv: string;
};

export type BoardStatusKey = "todo" | "in_progress" | "in_review" | "closed";

export type CardCoverVariant = "none" | "soft-gradient" | "shadow" | "waves";

export type BoardColumn = {
  id: string;
  statusKey: BoardStatusKey;
  name: string;
  position: number;
};

export type BoardCard = {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  dueDate?: string;
  position: number;
  assigneeInitials: string[];
  subtaskCount: number;
  attachmentCount: number;
  flagged: boolean;
  coverVariant: CardCoverVariant;
};

export type BoardState = {
  id: string;
  name: string;
  columns: BoardColumn[];
  cards: BoardCard[];
};
