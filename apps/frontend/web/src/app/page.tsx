"use client";

import dynamic from "next/dynamic";

const BoardExperience = dynamic(
  () => import("@/features/board/components/board-experience").then((mod) => mod.BoardExperience),
  {
    ssr: false,
    loading: () => (
      <main className="grid min-h-screen place-items-center bg-white text-sm text-[var(--color-muted)]">
        Loading board...
      </main>
    ),
  },
);

export default function HomePage() {
  return <BoardExperience />;
}
