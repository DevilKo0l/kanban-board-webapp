import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthGate } from "@/features/auth/components/auth-gate";

describe("AuthGate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows sign-in before rendering the board when no session exists", async () => {
    const fetchMock = mockFetch(jsonResponse({ detail: "Authentication required." }, 401));

    render(createElement(AuthGate));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Board view" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/v1/auth/me", {
      credentials: "include",
      method: "GET",
    });
  });

  it("accepts the MVP credentials and opens the board", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(
      jsonResponse({ detail: "Authentication required." }, 401),
      jsonResponse({ user: { username: "user" } }),
    );

    render(createElement(AuthGate));
    await screen.findByRole("heading", { name: "Sign in" });
    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Board view" })).toBeInTheDocument();
    expect(screen.getByLabelText("Signed in as user")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("http://localhost:8000/api/v1/auth/login", {
      body: JSON.stringify({ username: "user", password: "password" }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("shows a clear error for invalid credentials", async () => {
    const user = userEvent.setup();
    mockFetch(
      jsonResponse({ detail: "Authentication required." }, 401),
      jsonResponse({ detail: "Invalid username or password." }, 401),
    );

    render(createElement(AuthGate));
    await screen.findByRole("heading", { name: "Sign in" });
    await user.type(screen.getByLabelText("Username"), "user");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Board view" })).not.toBeInTheDocument();
  });

  it("logs out and returns to sign-in", async () => {
    const user = userEvent.setup();
    mockFetch(jsonResponse({ user: { username: "user" } }), emptyResponse());

    render(createElement(AuthGate));
    expect(await screen.findByRole("button", { name: "Board view" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Board view" })).not.toBeInTheDocument();
  });
});

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>(async () => responses.shift() ?? emptyResponse());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function emptyResponse() {
  return new Response(null, { status: 204 });
}
