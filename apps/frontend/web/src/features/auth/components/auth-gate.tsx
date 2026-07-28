"use client";

import { useEffect, useState } from "react";
import type { AuthSession } from "@kanban/types";

import { BoardExperience } from "@/features/board/components/board-experience";
import { SignInScreen } from "@/features/auth/components/sign-in-screen";
import { getCurrentSession, login, logout } from "@/features/auth/lib/auth-api";

type AuthState =
  | { status: "checking" }
  | { error?: string; status: "signed-out" }
  | { session: AuthSession; status: "signed-in" };

export function AuthGate() {
  const [authState, setAuthState] = useState<AuthState>({ status: "checking" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((session) => {
        if (active) {
          setAuthState({ status: "signed-in", session });
        }
      })
      .catch(() => {
        if (active) {
          setAuthState({ status: "signed-out" });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setSubmitting(true);
    try {
      const session = await login({ username, password });
      setAuthState({ status: "signed-in", session });
    } catch {
      setAuthState({
        status: "signed-out",
        error: "Invalid username or password.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setAuthState({ status: "signed-out" });
    }
  };

  if (authState.status === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-sm text-[var(--color-muted)]">
        Checking session...
      </main>
    );
  }

  if (authState.status === "signed-out") {
    return (
      <SignInScreen
        error={authState.error}
        loading={submitting}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <BoardExperience
      onLogout={handleLogout}
      username={authState.session.user.username}
    />
  );
}
