import { z } from "zod";

export const baseRecord = z.object({
  game: z.string(),
  id: z.string(),
});

export type BaseRecord = z.infer<typeof baseRecord>;
