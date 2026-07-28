"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";

type SignInScreenProps = {
  error?: string | undefined;
  loading: boolean;
  onSubmit: (username: string, password: string) => void;
};

export function SignInScreen({ error, loading, onSubmit }: SignInScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(username, password);
  };

  return (
    <main className="min-h-screen bg-white text-[var(--color-text)]">
      <div className="flex h-[50px] items-center bg-[var(--color-header)] px-5 text-white">
        <div className="grid size-8 place-items-center rounded-md bg-[var(--color-active-purple)] text-xs font-bold">
          K
        </div>
        <span className="ml-3 text-sm font-semibold">Project Hub</span>
      </div>
      <section className="grid min-h-[calc(100vh-50px)] place-items-center px-5 py-10">
        <div className="w-full max-w-[420px] rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[var(--color-active-purple-bg)] text-[var(--color-active-purple)]">
              <LockKeyhole aria-hidden="true" size={20} />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Sign in</h1>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Project board access</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              Username
              <input
                autoComplete="username"
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                disabled={loading}
                onChange={(event) => setUsername(event.target.value)}
                value={username}
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                autoComplete="current-password"
                className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            {error ? (
              <p className="rounded-md border border-[var(--color-review-label)] bg-[var(--color-review-bg)] px-3 py-2 text-sm text-[var(--color-review-yellow)]">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-active-purple)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn aria-hidden="true" size={17} />
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
