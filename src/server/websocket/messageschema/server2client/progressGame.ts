import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { z } from "zod";

export const progressGameMessageSchema = z.object({
  action: z.literal("progressGame"),
  data: gameMetaRecordSchema,
});

export type ProgressGameMessage = z.infer<typeof progressGameMessageSchema>;
