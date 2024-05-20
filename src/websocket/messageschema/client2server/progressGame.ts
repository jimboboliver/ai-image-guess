import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const progressGameMessageSchema = baseMessageSchema.extend({
  action: z.literal("progressGame"),
  dataClient: z.object({
    status: gameMetaRecordSchema.shape.status,
  }),
});

export type ProgressGameMessage = z.infer<typeof progressGameMessageSchema>;
