import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { handGuessRecordSchema } from "~/server/db/dynamodb/handGuess";
import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { makeGameMessageSchema } from "../../client2server/makeGame";
import { directResponseSchema } from "./directResponseSchema";

export const makeGameResponseSchema = makeGameMessageSchema
  .extend({
    dataClient: makeGameMessageSchema.shape.dataClient.optional(),
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

export type MakeGameResponse = z.infer<typeof makeGameResponseSchema>;
