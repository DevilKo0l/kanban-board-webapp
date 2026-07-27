import { describe, expect, it } from "vitest";

import {
  cardsForColumn,
  createCard,
  filterCards,
  moveCardFromDrag,
  moveCardRelative,
  updateCard,
} from "@/features/board/lib/board-operations";
import { initialBoard } from "@/features/board/lib/board-data";

describe("board operations", () => {
  it("filters cards by title and description", () => {
    expect(filterCards(initialBoard.cards, "budget")).toHaveLength(1);
    expect(filterCards(initialBoard.cards, "competitor")).toHaveLength(1);
    expect(filterCards(initialBoard.cards, "missing")).toHaveLength(0);
  });

  it("creates a card at the end of the target column", () => {
    const next = createCard(initialBoard, "col-todo", {
      title: "Prepare launch notes",
      description: "Keep this concise",
    });

    const todoCards = cardsForColumn(next.cards, "col-todo");

    expect(todoCards.at(-1)).toMatchObject({
      title: "Prepare launch notes",
      position: 3,
      columnId: "col-todo",
    });
  });

  it("updates editable card fields without changing column identity", () => {
    const next = updateCard(initialBoard, "card-brief", {
      title: "Updated brief",
      description: "New context",
      dueDate: "2026-09-02",
    });

    const card = next.cards.find((candidate) => candidate.id === "card-brief");

    expect(card).toMatchObject({
      columnId: "col-todo",
      title: "Updated brief",
      description: "New context",
      dueDate: "2026-09-02",
    });
  });

  it("moves cards deterministically from keyboard actions", () => {
    const next = moveCardRelative(initialBoard, "card-budget", "up");
    const todoCards = cardsForColumn(next.cards, "col-todo");

    expect(todoCards.map((card) => card.id)).toEqual(["card-brief", "card-budget", "card-research"]);
    expect(todoCards.map((card) => card.position)).toEqual([0, 1, 2]);
  });

  it("moves cards across columns from drag results", () => {
    const next = moveCardFromDrag(initialBoard, "card-brief", "card-copy");
    const progressCards = cardsForColumn(next.cards, "col-progress");

    expect(progressCards.map((card) => card.id).slice(0, 2)).toEqual(["card-brief", "card-copy"]);
    expect(progressCards.map((card) => card.position)).toEqual([0, 1, 2, 3, 4]);
  });
});
