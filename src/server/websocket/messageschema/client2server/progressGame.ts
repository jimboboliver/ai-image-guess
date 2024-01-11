import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { z } from "zod";

export const progressGameMessageSchema = z.object({
  action: z.literal("progressGame"),
  data: z.object({
    status: gameMetaRecordSchema.shape.status,
  }),
});

export type ProgressGameMessage = z.infer<typeof progressGameMessageSchema>;
