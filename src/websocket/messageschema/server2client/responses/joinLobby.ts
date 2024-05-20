import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { handGuessRecordSchema } from "~/server/db/dynamodb/handGuess";
import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { joinLobbyMessageSchema } from "../../client2server/joinLobby";
import { directResponseSchema } from "./directResponseSchema";

export const joinLobbyResponseSchema = joinLobbyMessageSchema
  .extend({
    dataClient: joinLobbyMessageSchema.shape.dataClient.optional(),
    dataServer: z
      .object({
        playerPublicRecord: playerPublicRecordSchema,
        connectionRecord: connectionRecordSchema,
        handRecord: handGuessRecordSchema.or(handVoteRecordSchema),
      })
      .optional(),
  })
  .extend(directResponseSchema.shape)
  .refine((data) => {
    if (data.serverStatus === "success") {
      return data.dataServer != null;
    }
    return data.dataServer == null;
  });

export type JoinLobbyResponse = z.infer<typeof joinLobbyResponseSchema>;
