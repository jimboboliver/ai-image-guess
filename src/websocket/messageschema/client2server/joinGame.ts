import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const joinGameMessageSchema = baseMessageSchema.extend({
  action: z.literal("joinGame"),
  dataClient: z.object({
    gameCode: gameMetaRecordSchema.shape.gameCode,
    name: playerRecordSchema.shape.name,
    playerId: z.string(),
    secretId: playerRecordSchema.shape.secretId,
  }),
});

export type JoinGameMessage = z.infer<typeof joinGameMessageSchema>;
