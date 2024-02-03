import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { z } from "zod";

export const joinGameMessageSchema = z.object({
  action: z.literal("joinGame"),
  data: z.object({
    gameCode: gameMetaRecordSchema.shape.gameCode,
    name: connectionRecordSchema.shape.name,
  }),
});

export type JoinGameMessage = z.infer<typeof joinGameMessageSchema>;
