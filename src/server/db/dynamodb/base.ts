import { z } from "zod";

export const baseRecord = z.object({
  pk: z.string(),
  sk: z.string(),
});

export type BaseRecord = z.infer<typeof baseRecord>;
