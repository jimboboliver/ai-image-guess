import React from "react";
import { Game } from "~/app/_components/Game";

export default async function Home() {
  return (
    <main className="bg-base-100 flex min-h-screen flex-col items-center justify-center">
      <Game />
    </main>
  );
}
