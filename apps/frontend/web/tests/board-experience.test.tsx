import { createElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BoardExperience } from "@/features/board/components/board-experience";

describe("BoardExperience", () => {
  it("renders the shell, active board tab, status columns, and disabled view tabs", () => {
    render(createElement(BoardExperience));

    expect(screen.getByLabelText("Window controls")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board view" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "List view unavailable" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Calendar view unavailable" })).toBeDisabled();
    expect(screen.getByRole("navigation", { name: "Workspace navigation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Board view controls")).toHaveClass("overflow-x-auto");
    expect(screen.getByLabelText("Search cards").closest("div")).toHaveClass("border-t");
    expect(screen.getByRole("region", { name: /To Do column with 3 cards/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /In Progress column with 4 cards/i })).toBeInTheDocument();
    expect(screen.getByLabelText("In Review collapsed column")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Closed column with 4 cards/i })).toBeInTheDocument();
  });

  it("filters visible cards and updates the visible count", async () => {
    const user = userEvent.setup();
    render(createElement(BoardExperience));

    await user.type(screen.getByLabelText("Search cards"), "budget");

    expect(screen.getByText("1 of 12")).toBeInTheDocument();
    expect(screen.getByText("Confirm budgets")).toBeInTheDocument();
    expect(screen.queryByText("Finalize campaign brief")).not.toBeInTheDocument();
  });

  it("collapses and expands a column without losing card data", async () => {
    const user = userEvent.setup();
    render(createElement(BoardExperience));

    await user.click(screen.getByRole("button", { name: "Collapse To Do" }));
    expect(screen.getByLabelText("To Do collapsed column")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand To Do" }));
    expect(screen.getByRole("region", { name: /To Do column with 3 cards/i })).toBeInTheDocument();
    expect(screen.getByText("Finalize campaign brief")).toBeInTheDocument();
  });

  it("keeps card details from shrinking out of view inside scrollable columns", () => {
    render(createElement(BoardExperience));

    const card = screen.getByRole("button", { name: "Finalize campaign brief" }).closest("article");

    expect(card).toHaveClass("shrink-0");
    expect(within(card as HTMLElement).getByText("4 subtasks")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByLabelText("2 assignees")).toBeInTheDocument();
  });

  it("creates and edits a card with local state", async () => {
    const user = userEvent.setup();
    render(createElement(BoardExperience));

    const todoColumn = screen.getByRole("region", { name: /To Do column/i });
    await user.click(within(todoColumn).getByRole("button", { name: "Add task" }));
    await user.type(screen.getByLabelText("Title"), "Prepare partner update");
    await user.type(screen.getByLabelText("Description"), "Send the summary before review.");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(screen.getByText("Prepare partner update")).toBeInTheDocument();
    expect(screen.getByText("13 of 13")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Prepare partner update" }));
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Prepare partner update draft");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("Prepare partner update draft")).toBeInTheDocument();
    expect(screen.queryByText("Prepare partner update", { exact: true })).not.toBeInTheDocument();
  });

  it("opens and closes the AI drawer preview", async () => {
    const user = userEvent.setup();
    render(createElement(BoardExperience));

    await user.click(screen.getByRole("button", { name: "Open AI assistant preview" }));
    expect(screen.getByRole("complementary", { name: "AI assistant preview drawer" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close AI drawer" }));
    expect(screen.queryByRole("complementary", { name: "AI assistant preview drawer" })).not.toBeInTheDocument();
  });
});
