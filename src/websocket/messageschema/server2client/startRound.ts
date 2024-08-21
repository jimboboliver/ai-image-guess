import { lobbyMetaRecordSchema } from "~/server/db/dynamodb/lobbyMeta";
import { roundRecordSchema } from "~/server/db/dynamodb/round";
import { z } from "zod";

export const startRoundMessageSchema = z.object({
  action: z.literal("startRound"),
  dataServer: z.object({
    lobbyMetaRecord: lobbyMetaRecordSchema,
    roundRecord: roundRecordSchema,
  }),
});

export type StartRoundMessage = z.infer<typeof startRoundMessageSchema>;
