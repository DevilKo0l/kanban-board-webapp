"use client";

import dynamic from "next/dynamic";

const AuthGate = dynamic(
  () => import("@/features/auth/components/auth-gate").then((mod) => mod.AuthGate),
  {
    ssr: false,
    loading: () => (
      <main className="grid min-h-screen place-items-center bg-white text-sm text-[var(--color-muted)]">
        Loading...
      </main>
    ),
  },
);

export default function HomePage() {
  return <AuthGate />;
}
