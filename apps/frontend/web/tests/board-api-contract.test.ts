import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCard,
  getBoard,
  moveCard,
  renameColumn,
  sendAiChat,
  updateCard,
} from "@/features/board/lib/board-api";

import { jsonResponse, testBoard } from "./board-fixtures";

describe("board API contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the backend board response as the shared BoardState contract", async () => {
    const fetchMock = mockFetch(jsonResponse(testBoard));

    const board = await getBoard();

    expect(board.columns[0]).toEqual({
      id: "col-todo",
      name: "To Do",
      position: 1000,
      statusKey: "todo",
    });
    expect(board.cards[0]).toMatchObject({
      assigneeInitials: ["ML", "JR"],
      columnId: "col-todo",
      coverVariant: "none",
      description: "Tighten the positioning notes before the kickoff review.",
      dueDate: null,
      title: "Finalize campaign brief",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/board", {
      credentials: "include",
      method: "GET",
    });
  });

  it("uses backend request payload casing for board mutations", async () => {
    const fetchMock = mockFetch(
      jsonResponse(testBoard.columns[0]),
      jsonResponse(testBoard.cards[0], 201),
      jsonResponse(testBoard.cards[0]),
      jsonResponse(testBoard),
    );

    await renameColumn("col-todo", { name: "Backlog" });
    await createCard({
      columnId: "col-todo",
      description: "A concise note.",
      dueDate: null,
      title: "New backend task",
    });
    await updateCard("card-brief", {
      description: null,
      dueDate: "2026-08-02",
      title: "Updated backend task",
    });
    await moveCard("card-brief", { columnId: "col-progress", position: 0 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/columns/col-todo",
      expect.objectContaining({
        body: JSON.stringify({ name: "Backlog" }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/api/v1/cards",
      expect.objectContaining({
        body: JSON.stringify({
          columnId: "col-todo",
          description: "A concise note.",
          dueDate: null,
          title: "New backend task",
        }),
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8000/api/v1/cards/card-brief",
      expect.objectContaining({
        body: JSON.stringify({
          description: null,
          dueDate: "2026-08-02",
          title: "Updated backend task",
        }),
        method: "PATCH",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8000/api/v1/cards/card-brief/move",
      expect.objectContaining({
        body: JSON.stringify({ columnId: "col-progress", position: 0 }),
        method: "POST",
      }),
    );
  });

  it("uses the shared AI chat request and response contract", async () => {
    const fetchMock = mockFetch(
      jsonResponse({
        assistantMessage: "No board changes were needed.",
        actions: [],
        board: testBoard,
      }),
    );

    const response = await sendAiChat({
      message: "Summarize the board.",
      history: [{ role: "assistant", content: "Ready to help." }],
    });

    expect(response.assistantMessage).toBe("No board changes were needed.");
    expect(response.board.cards).toHaveLength(12);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ai/chat",
      expect.objectContaining({
        body: JSON.stringify({
          message: "Summarize the board.",
          history: [{ role: "assistant", content: "Ready to help." }],
        }),
        method: "POST",
      }),
    );
  });
});

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>(async () => responses.shift() ?? jsonResponse({}));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
