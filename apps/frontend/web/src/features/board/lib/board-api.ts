import type {
  BoardCard,
  BoardColumn,
  BoardState,
  CardCreateRequest,
  CardUpdateRequest,
  MoveCardRequest,
  RenameColumnRequest,
} from "@kanban/types";

import { apiRequest } from "@/lib/api-client";

export type CardDraft = {
  title: string;
  description?: string;
  dueDate?: string;
};

export function getBoard() {
  return apiRequest<BoardState>("/api/v1/board");
}

export function renameColumn(columnId: string, payload: RenameColumnRequest) {
  return apiRequest<BoardColumn>(`/api/v1/columns/${columnId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function createCard(payload: CardCreateRequest) {
  return apiRequest<BoardCard>("/api/v1/cards", {
    method: "POST",
    body: payload,
  });
}

export function updateCard(cardId: string, payload: CardUpdateRequest) {
  return apiRequest<BoardCard>(`/api/v1/cards/${cardId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function moveCard(cardId: string, payload: MoveCardRequest) {
  return apiRequest<BoardState>(`/api/v1/cards/${cardId}/move`, {
    method: "POST",
    body: payload,
  });
}
