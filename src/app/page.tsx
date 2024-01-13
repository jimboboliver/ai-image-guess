import React from "react";

import { Game } from "./_components/Game";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-base-100">
      <Game />
    </main>
  );
}
