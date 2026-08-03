export type ApiStatus = {
  name: string;
  version: string;
  api_prefix: string;
};

export type HealthStatus = {
  status: "ok";
  app_env: string;
};

export type AuthUser = {
  username: string;
};

export type AuthSession = {
  user: AuthUser;
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
  description: string | null;
  dueDate: string | null;
  position: number;
  assigneeInitials: string[];
  subtaskCount: number;
  attachmentCount: number;
  flagged: boolean;
  coverVariant: CardCoverVariant;
  createdAt: string;
  updatedAt: string;
};

export type BoardState = {
  id: string;
  name: string;
  columns: BoardColumn[];
  cards: BoardCard[];
};

export type RenameColumnRequest = {
  name: string;
};

export type CardCreateRequest = {
  columnId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
};

export type CardUpdateRequest = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
};

export type MoveCardRequest = {
  columnId: string;
  position: number;
};

export type AiConversationMessage = {
  role: "assistant" | "user";
  content: string;
};

export type AiAppliedAction = {
  type: "create_card" | "edit_card" | "move_card";
  cardId: string | null;
  columnId: string | null;
};

export type AiChatRequest = {
  message: string;
  history?: AiConversationMessage[];
};

export type AiChatResponse = {
  assistantMessage: string;
  actions: AiAppliedAction[];
  board: BoardState;
};
