import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

import { voteMessageSchema } from "../../client2server/vote";
import { directResponseSchema } from "./directResponseSchema";

export const voteResponseSchema = voteMessageSchema
  .extend({
    dataClient: voteMessageSchema.shape.dataClient.optional(),
    dataServer: z
      .object({
        imageRecord: imageRecordSchema,
        handRecord: handVoteRecordSchema,
      })
      .optional(),
  })
  .extend(directResponseSchema.shape);

export type VoteResponse = z.infer<typeof voteResponseSchema>;
