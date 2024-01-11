import React from "react";

import { Game } from "./_components/Game";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-lime-800 to-lime-950 text-white">
      <Game />
    </main>
  );
}
