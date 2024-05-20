import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { z } from "zod";

export const progressedGameMessageSchema = z.object({
  action: z.literal("progressedGame"),
  dataServer: gameMetaRecordSchema,
});

export type ProgressedGameMessage = z.infer<typeof progressedGameMessageSchema>;
