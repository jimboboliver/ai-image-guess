import { lobbyMetaRecordSchema } from "~/server/db/dynamodb/lobbyMeta";
import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const joinLobbyMessageSchema = baseMessageSchema.extend({
  action: z.literal("joinLobby"),
  dataClient: z.object({
    lobbyCode: lobbyMetaRecordSchema.shape.lobbyCode,
    name: playerRecordSchema.shape.name,
    playerId: z.string(),
    secretId: playerRecordSchema.shape.secretId,
  }),
});

export type JoinLobbyMessage = z.infer<typeof joinLobbyMessageSchema>;
