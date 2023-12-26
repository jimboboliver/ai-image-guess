import { z } from "zod";

export const connectionRecordSchema = z.object({
  game: z.string(),
  id: z.string(),
  connectionId: z.string(),
});

export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;
