import type { BoardCard, BoardColumn, BoardState } from "@kanban/types";

export type CardDraft = {
  title: string;
  description?: string;
  dueDate?: string;
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

export function normalizeColumnPositions(cards: BoardCard[]) {
  const grouped = new Map<string, BoardCard[]>();
  for (const card of cards) {
    const existing = grouped.get(card.columnId) ?? [];
    existing.push(card);
    grouped.set(card.columnId, existing);
  }

  return Array.from(grouped.values()).flatMap((columnCards) =>
    sortCards(columnCards).map((card, position) => ({ ...card, position })),
  );
}

export function createCard(state: BoardState, columnId: string, draft: CardDraft): BoardState {
  const nextPosition = cardsForColumn(state.cards, columnId).length;
  const card: BoardCard = {
    id: `card-${crypto.randomUUID()}`,
    columnId,
    title: draft.title.trim(),
    ...(draft.description?.trim() ? { description: draft.description.trim() } : {}),
    ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
    position: nextPosition,
    assigneeInitials: [],
    subtaskCount: 0,
    attachmentCount: 0,
    flagged: false,
    coverVariant: "none",
  };

  return { ...state, cards: normalizeColumnPositions([...state.cards, card]) };
}

export function updateCard(state: BoardState, cardId: string, draft: CardDraft): BoardState {
  return {
    ...state,
    cards: normalizeColumnPositions(
      state.cards.map((card) => {
        if (card.id !== cardId) {
          return card;
        }

        const nextCard: BoardCard = {
          ...card,
          title: draft.title.trim(),
        };

        const description = draft.description?.trim();
        if (description) {
          nextCard.description = description;
        } else {
          delete nextCard.description;
        }

        if (draft.dueDate) {
          nextCard.dueDate = draft.dueDate;
        } else {
          delete nextCard.dueDate;
        }

        return nextCard;
      }),
    ),
  };
}

export function moveCardToColumn(
  state: BoardState,
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
): BoardState {
  const movingCard = state.cards.find((card) => card.id === cardId);
  if (!movingCard) {
    return state;
  }

  const otherCards = state.cards.filter((card) => card.id !== cardId);
  const targetCards = cardsForColumn(otherCards, targetColumnId);
  const boundedIndex = Math.max(0, Math.min(targetIndex, targetCards.length));
  targetCards.splice(boundedIndex, 0, { ...movingCard, columnId: targetColumnId });

  const unchangedCards = otherCards.filter((card) => card.columnId !== targetColumnId);
  const repositionedTargetCards = targetCards.map((card, position) => ({ ...card, position }));

  return {
    ...state,
    cards: normalizeColumnPositions([...unchangedCards, ...repositionedTargetCards]),
  };
}

export function moveCardRelative(
  state: BoardState,
  cardId: string,
  direction: "left" | "right" | "up" | "down",
): BoardState {
  const card = state.cards.find((candidate) => candidate.id === cardId);
  if (!card) {
    return state;
  }

  const columns = sortColumns(state.columns);
  const columnIndex = columns.findIndex((column) => column.id === card.columnId);
  const currentColumnCards = cardsForColumn(state.cards, card.columnId);
  const cardIndex = currentColumnCards.findIndex((candidate) => candidate.id === cardId);

  if (direction === "up" || direction === "down") {
    const offset = direction === "up" ? -1 : 1;
    return moveCardToColumn(state, cardId, card.columnId, cardIndex + offset);
  }

  const columnOffset = direction === "left" ? -1 : 1;
  const targetColumn = columns[columnIndex + columnOffset];
  if (!targetColumn) {
    return state;
  }

  return moveCardToColumn(
    state,
    cardId,
    targetColumn.id,
    cardsForColumn(state.cards, targetColumn.id).length,
  );
}

export function moveCardFromDrag(
  state: BoardState,
  activeId: string,
  overId: string | null,
): BoardState {
  if (!overId || activeId === overId) {
    return state;
  }

  const overColumn = state.columns.find((column) => column.id === overId);
  if (overColumn) {
    return moveCardToColumn(state, activeId, overColumn.id, cardsForColumn(state.cards, overColumn.id).length);
  }

  const overCard = state.cards.find((card) => card.id === overId);
  if (!overCard) {
    return state;
  }

  const targetCards = cardsForColumn(state.cards, overCard.columnId);
  const targetIndex = targetCards.findIndex((card) => card.id === overCard.id);
  return moveCardToColumn(state, activeId, overCard.columnId, targetIndex);
}
