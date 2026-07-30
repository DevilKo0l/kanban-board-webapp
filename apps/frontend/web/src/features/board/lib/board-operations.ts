import type { BoardCard, BoardColumn, BoardState } from "@kanban/types";

export type MoveDirection = "left" | "right" | "up" | "down";

export type MoveIntent = {
  columnId: string;
  position: number;
};

export function sortColumns(columns: BoardColumn[]) {
  return [...columns].sort((first, second) => first.position - second.position);
}

export function sortCards(cards: BoardCard[]) {
  return [...cards].sort((first, second) => first.position - second.position);
}

export function cardsForColumn(cards: BoardCard[], columnId: string) {
  return sortCards(cards.filter((card) => card.columnId === columnId));
}

export function filterCards(cards: BoardCard[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return cards;
  }

  return cards.filter((card) => {
    const haystack = `${card.title} ${card.description ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function getMoveIntentToColumn(
  state: BoardState,
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
): MoveIntent | null {
  const movingCard = state.cards.find((card) => card.id === cardId);
  if (!movingCard) {
    return null;
  }

  const otherCards = state.cards.filter((card) => card.id !== cardId);
  const targetCards = cardsForColumn(otherCards, targetColumnId);
  const boundedIndex = Math.max(0, Math.min(targetIndex, targetCards.length));

  if (movingCard.columnId === targetColumnId) {
    const currentIndex = cardsForColumn(state.cards, movingCard.columnId).findIndex(
      (card) => card.id === cardId,
    );
    if (currentIndex === boundedIndex) {
      return null;
    }
  }

  return { columnId: targetColumnId, position: boundedIndex };
}

export function getMoveIntentRelative(
  state: BoardState,
  cardId: string,
  direction: MoveDirection,
): MoveIntent | null {
  const card = state.cards.find((candidate) => candidate.id === cardId);
  if (!card) {
    return null;
  }

  const columns = sortColumns(state.columns);
  const columnIndex = columns.findIndex((column) => column.id === card.columnId);
  const currentColumnCards = cardsForColumn(state.cards, card.columnId);
  const cardIndex = currentColumnCards.findIndex((candidate) => candidate.id === cardId);

  if (direction === "up" || direction === "down") {
    const offset = direction === "up" ? -1 : 1;
    const targetIndex = cardIndex + offset;
    if (targetIndex < 0 || targetIndex >= currentColumnCards.length) {
      return null;
    }
    return getMoveIntentToColumn(state, cardId, card.columnId, targetIndex);
  }

  const columnOffset = direction === "left" ? -1 : 1;
  const targetColumn = columns[columnIndex + columnOffset];
  if (!targetColumn) {
    return null;
  }

  return getMoveIntentToColumn(
    state,
    cardId,
    targetColumn.id,
    cardsForColumn(state.cards, targetColumn.id).length,
  );
}

export function getMoveIntentFromDrag(
  state: BoardState,
  activeId: string,
  overId: string | null,
): MoveIntent | null {
  if (!overId || activeId === overId) {
    return null;
  }

  const overColumn = state.columns.find((column) => column.id === overId);
  if (overColumn) {
    return getMoveIntentToColumn(
      state,
      activeId,
      overColumn.id,
      cardsForColumn(state.cards, overColumn.id).length,
    );
  }

  const overCard = state.cards.find((card) => card.id === overId);
  if (!overCard) {
    return null;
  }

  const targetCards = cardsForColumn(
    state.cards.filter((card) => card.id !== activeId),
    overCard.columnId,
  );
  const targetIndex = targetCards.findIndex((card) => card.id === overCard.id);
  return getMoveIntentToColumn(state, activeId, overCard.columnId, targetIndex);
}
