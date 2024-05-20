import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { handGuessPublicRecordSchema } from "~/server/db/dynamodb/handGuess";
import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { lobbyMetaRecordSchema } from "~/server/db/dynamodb/lobbyMeta";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const fullLobbyMessageSchema = z.object({
  action: z.literal("fullLobby"),
  dataServer: z.array(
    imageRecordSchema
      .or(playerPublicRecordSchema)
      .or(lobbyMetaRecordSchema)
      .or(connectionRecordSchema)
      .or(handGuessPublicRecordSchema)
      .or(handVoteRecordSchema),
  ),
});

export type FullLobbyMessage = z.infer<typeof fullLobbyMessageSchema>;
