import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { handGuessRecordSchema } from "~/server/db/dynamodb/handGuess";
import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { joinGameMessageSchema } from "../../client2server/joinGame";
import { directResponseSchema } from "./directResponseSchema";

export const joinGameResponseSchema = joinGameMessageSchema
  .extend({
    dataClient: joinGameMessageSchema.shape.dataClient.optional(),
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

export type JoinGameResponse = z.infer<typeof joinGameResponseSchema>;
