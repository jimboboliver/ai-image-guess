import { z } from "zod";

export const gameRecord = z.object({
  game: z.string(),
  id: z.string(),
});

export type GameRecord = z.infer<typeof gameRecord>;
