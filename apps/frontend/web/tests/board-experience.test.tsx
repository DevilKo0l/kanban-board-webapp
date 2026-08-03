import { createElement } from "react";
import type { BoardCard, BoardState } from "@kanban/types";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoardExperience } from "@/features/board/components/board-experience";

import { cloneBoard, jsonResponse } from "./board-fixtures";

describe("BoardExperience", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the shell, active board tab, status columns, and disabled view tabs from the API", async () => {
    mockBoardApi();

    render(createElement(BoardExperience));

    expect(screen.getByLabelText("Loading board")).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: /To Do column with 3 cards/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Window controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board view" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "List view unavailable" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Calendar view unavailable" })).toBeDisabled();
    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Board view controls")).toHaveClass("overflow-x-auto");
    expect(screen.getByLabelText("Search cards").closest("div")).toHaveClass("border-t");
    expect(screen.getByRole("region", { name: /In Progress column with 4 cards/i })).toBeInTheDocument();
    expect(screen.getByLabelText("In Review collapsed column")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Closed column with 4 cards/i })).toBeInTheDocument();
  });

  it("shows a retry state when board loading fails", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ detail: "Board unavailable." }, 500))
      .mockResolvedValueOnce(jsonResponse(cloneBoard()));
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(BoardExperience));

    expect(await screen.findByRole("region", { name: "Board load error" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("region", { name: /To Do column with 3 cards/i })).toBeInTheDocument();
  });

  it("filters visible cards and updates the visible count", async () => {
    const user = userEvent.setup();
    mockBoardApi();
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.type(screen.getByLabelText("Search cards"), "budget");

    expect(screen.getByText("1 of 12")).toBeInTheDocument();
    expect(screen.getByText("Confirm budgets")).toBeInTheDocument();
    expect(screen.queryByText("Finalize campaign brief")).not.toBeInTheDocument();
  });

  it("collapses and expands a column without losing card data", async () => {
    const user = userEvent.setup();
    mockBoardApi();
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.click(screen.getByRole("button", { name: "Collapse To Do" }));
    expect(screen.getByLabelText("To Do collapsed column")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand To Do" }));
    expect(screen.getByRole("region", { name: /To Do column with 3 cards/i })).toBeInTheDocument();
    expect(screen.getByText("Finalize campaign brief")).toBeInTheDocument();
  });

  it("keeps card details from shrinking out of view inside scrollable columns", async () => {
    mockBoardApi();
    render(createElement(BoardExperience));

    const cardButton = await screen.findByRole("button", { name: "Finalize campaign brief" });
    const card = cardButton.closest("article");

    expect(card).toHaveClass("shrink-0");
    expect(within(card as HTMLElement).getByText("4 subtasks")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByLabelText("2 assignees")).toBeInTheDocument();
  });

  it("creates and edits a card through the backend API", async () => {
    const user = userEvent.setup();
    const api = mockBoardApi();
    render(createElement(BoardExperience));

    const todoColumn = await screen.findByRole("region", { name: /To Do column/i });
    await user.click(within(todoColumn).getByRole("button", { name: "Add task" }));
    await user.type(screen.getByLabelText("Title"), "Prepare partner update");
    await user.type(screen.getByLabelText("Description"), "Send the summary before review.");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Prepare partner update")).toBeInTheDocument();
    expect(screen.getByText("13 of 13")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Prepare partner update" }));
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Prepare partner update draft");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Prepare partner update draft")).toBeInTheDocument();
    expect(screen.queryByText("Prepare partner update", { exact: true })).not.toBeInTheDocument();
    expect(api.fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/cards",
      expect.objectContaining({ method: "POST" }),
    );
    expect(api.fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/cards/card-created",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("renames a fixed column through the backend API", async () => {
    const user = userEvent.setup();
    mockBoardApi();
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.click(screen.getByRole("button", { name: "Rename To Do" }));
    await user.clear(screen.getByLabelText("Column name"));
    await user.type(screen.getByLabelText("Column name"), "Backlog");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByRole("region", { name: /Backlog column with 3 cards/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /To Do column with 3 cards/i })).not.toBeInTheDocument();
  });

  it("persists keyboard card moves through the backend API", async () => {
    const user = userEvent.setup();
    const api = mockBoardApi();
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.click(screen.getByRole("button", { name: "Move Confirm budgets up" }));

    await waitFor(() => {
      const todoCards = api.board.cards
        .filter((card) => card.columnId === "col-todo")
        .sort((first, second) => first.position - second.position);
      expect(todoCards.map((card) => card.id)).toEqual([
        "card-brief",
        "card-budget",
        "card-research",
      ]);
    });
    expect(api.fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/cards/card-budget/move",
      expect.objectContaining({
        body: JSON.stringify({ columnId: "col-todo", position: 1 }),
        method: "POST",
      }),
    );
  });

  it("opens and closes the AI drawer", async () => {
    const user = userEvent.setup();
    mockBoardApi();
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.click(screen.getByRole("button", { name: "Open AI assistant" }));
    expect(screen.getByRole("complementary", { name: "AI assistant drawer" })).toBeInTheDocument();
    expect(screen.getByLabelText("Kanban board")).toBeInTheDocument();
    expect(screen.getByLabelText("Search cards")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Close AI drawer" }));
    expect(screen.queryByRole("complementary", { name: "AI assistant drawer" })).not.toBeInTheDocument();
  });

  it("sends AI chat messages, reconciles the returned board, and highlights changed cards", async () => {
    const user = userEvent.setup();
    const api = mockBoardApi();
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.type(screen.getByLabelText("Search cards"), "launch");
    await user.click(screen.getByRole("button", { name: "Open AI assistant" }));
    await user.type(screen.getByLabelText("AI message"), "Create an AI launch checklist");
    await user.click(screen.getByRole("button", { name: "Send AI message" }));

    expect(await screen.findByText("Create an AI launch checklist")).toBeInTheDocument();
    expect(await screen.findByText("Created AI launch checklist.")).toBeInTheDocument();
    expect(screen.getByText("1 board change applied.")).toBeInTheDocument();
    expect(screen.getByLabelText("Search cards")).toHaveValue("launch");

    const aiCardButton = await screen.findByRole("button", { name: "AI launch checklist" });
    expect(aiCardButton.closest("article")).toHaveAttribute("data-ai-highlighted", "true");
    expect(api.fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/ai/chat",
      expect.objectContaining({
        body: JSON.stringify({
          message: "Create an AI launch checklist",
          history: [],
        }),
        method: "POST",
      }),
    );
  });

  it("shows AI errors and re-enables submission after provider failures", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(cloneBoard()))
      .mockResolvedValueOnce(jsonResponse({ detail: "OpenRouter API key is not configured." }, 503));
    vi.stubGlobal("fetch", fetchMock);
    render(createElement(BoardExperience));

    await screen.findByRole("region", { name: /To Do column with 3 cards/i });
    await user.click(screen.getByRole("button", { name: "Open AI assistant" }));
    await user.type(screen.getByLabelText("AI message"), "Create a task");
    await user.click(screen.getByRole("button", { name: "Send AI message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("OpenRouter API key is not configured.");
    expect(screen.getByRole("button", { name: "Send AI message" })).toBeDisabled();
    await user.type(screen.getByLabelText("AI message"), "Try again");
    expect(screen.getByRole("button", { name: "Send AI message" })).toBeEnabled();
  });
});

function mockBoardApi(seed: BoardState = cloneBoard()) {
  const api = {
    board: cloneBoard(seed),
    fetchMock: vi.fn<typeof fetch>(),
  };

  api.fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/v1/board") && method === "GET") {
      return jsonResponse(api.board);
    }

    const columnMatch = /\/api\/v1\/columns\/([^/]+)$/.exec(url);
    if (columnMatch && method === "PATCH") {
      const payload = parseJsonBody<{ name: string }>(init);
      api.board.columns = api.board.columns.map((column) =>
        column.id === columnMatch[1] ? { ...column, name: payload.name } : column,
      );
      return jsonResponse(api.board.columns.find((column) => column.id === columnMatch[1]));
    }

    if (url.endsWith("/api/v1/cards") && method === "POST") {
      const payload = parseJsonBody<{
        columnId: string;
        description: string | null;
        dueDate: string | null;
        title: string;
      }>(init);
      const card: BoardCard = {
        id: "card-created",
        columnId: payload.columnId,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        position: nextPosition(api.board, payload.columnId),
        assigneeInitials: [],
        subtaskCount: 0,
        attachmentCount: 0,
        flagged: false,
        coverVariant: "none",
        createdAt: "2026-07-29T00:00:00Z",
        updatedAt: "2026-07-29T00:00:00Z",
      };
      api.board.cards = [...api.board.cards, card];
      return jsonResponse(card, 201);
    }

    if (url.endsWith("/api/v1/ai/chat") && method === "POST") {
      const payload = parseJsonBody<{ message: string }>(init);
      const card: BoardCard = {
        id: "card-ai-created",
        columnId: "col-todo",
        title: "AI launch checklist",
        description: payload.message,
        dueDate: null,
        position: nextPosition(api.board, "col-todo"),
        assigneeInitials: [],
        subtaskCount: 0,
        attachmentCount: 0,
        flagged: false,
        coverVariant: "none",
        createdAt: "2026-07-29T00:00:00Z",
        updatedAt: "2026-07-29T00:00:01Z",
      };
      api.board.cards = [...api.board.cards, card];
      return jsonResponse({
        assistantMessage: "Created AI launch checklist.",
        actions: [{ type: "create_card", cardId: card.id, columnId: "col-todo" }],
        board: api.board,
      });
    }

    const cardUpdateMatch = /\/api\/v1\/cards\/([^/]+)$/.exec(url);
    if (cardUpdateMatch && method === "PATCH") {
      const payload = parseJsonBody<{
        description: string | null;
        dueDate: string | null;
        title: string;
      }>(init);
      let updatedCard: BoardCard | undefined;
      api.board.cards = api.board.cards.map((card) => {
        if (card.id !== cardUpdateMatch[1]) {
          return card;
        }
        updatedCard = {
          ...card,
          title: payload.title,
          description: payload.description,
          dueDate: payload.dueDate,
          updatedAt: "2026-07-29T00:00:01Z",
        };
        return updatedCard;
      });
      return jsonResponse(updatedCard);
    }

    const cardMoveMatch = /\/api\/v1\/cards\/([^/]+)\/move$/.exec(url);
    if (cardMoveMatch && method === "POST") {
      const payload = parseJsonBody<{ columnId: string; position: number }>(init);
      moveCardInFixture(api.board, cardMoveMatch[1] ?? "", payload.columnId, payload.position);
      return jsonResponse(api.board);
    }

    return jsonResponse({ detail: "Unhandled test request." }, 500);
  });
  vi.stubGlobal("fetch", api.fetchMock);
  return api;
}

function parseJsonBody<T>(init: RequestInit | undefined): T {
  return JSON.parse(String(init?.body ?? "{}")) as T;
}

function nextPosition(board: BoardState, columnId: string) {
  const positions = board.cards
    .filter((card) => card.columnId === columnId)
    .map((card) => card.position);
  return positions.length > 0 ? Math.max(...positions) + 1000 : 1000;
}

function moveCardInFixture(
  board: BoardState,
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
) {
  const movingCard = board.cards.find((card) => card.id === cardId);
  if (!movingCard) {
    return;
  }

  const sourceColumnId = movingCard.columnId;
  const otherCards = board.cards.filter((card) => card.id !== cardId);
  const sourceCards = otherCards
    .filter((card) => card.columnId === sourceColumnId)
    .sort((first, second) => first.position - second.position);
  const targetCards = otherCards
    .filter((card) => card.columnId === targetColumnId)
    .sort((first, second) => first.position - second.position);
  targetCards.splice(Math.max(0, Math.min(targetIndex, targetCards.length)), 0, {
    ...movingCard,
    columnId: targetColumnId,
  });

  const repositionedTarget = targetCards.map((card, index) => ({
    ...card,
    columnId: targetColumnId,
    position: (index + 1) * 1000,
  }));
  const repositionedSource =
    sourceColumnId === targetColumnId
      ? []
      : sourceCards.map((card, index) => ({ ...card, position: (index + 1) * 1000 }));
  const unaffected = otherCards.filter(
    (card) => card.columnId !== sourceColumnId && card.columnId !== targetColumnId,
  );

  board.cards = [...unaffected, ...repositionedSource, ...repositionedTarget];
}
