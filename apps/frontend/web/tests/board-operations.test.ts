import { describe, expect, it } from "vitest";

import {
  cardsForColumn,
  filterCards,
  getMoveIntentFromDrag,
  getMoveIntentRelative,
} from "@/features/board/lib/board-operations";

import { testBoard } from "./board-fixtures";

describe("board operations", () => {
  it("filters cards by title and description", () => {
    expect(filterCards(testBoard.cards, "budget")).toHaveLength(1);
    expect(filterCards(testBoard.cards, "competitor")).toHaveLength(1);
    expect(filterCards(testBoard.cards, "missing")).toHaveLength(0);
  });

  it("calculates deterministic backend move payloads from keyboard actions", () => {
    expect(getMoveIntentRelative(testBoard, "card-budget", "up")).toEqual({
      columnId: "col-todo",
      position: 1,
    });
    expect(getMoveIntentRelative(testBoard, "card-brief", "left")).toBeNull();
  });

  it("calculates backend move payloads from drag results", () => {
    expect(getMoveIntentFromDrag(testBoard, "card-brief", "card-copy")).toEqual({
      columnId: "col-progress",
      position: 0,
    });
    expect(getMoveIntentFromDrag(testBoard, "card-brief", "col-progress")).toEqual({
      columnId: "col-progress",
      position: 4,
    });
  });

  it("keeps sorting helpers compatible with backend position gaps", () => {
    expect(cardsForColumn(testBoard.cards, "col-todo").map((card) => card.id)).toEqual([
      "card-brief",
      "card-research",
      "card-budget",
    ]);
  });
});
