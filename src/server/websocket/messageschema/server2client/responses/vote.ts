import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { voteMessageSchema } from "../../client2server/vote";
import { directResponseSchema } from "./directResponseSchema";

export const voteResponseSchema = voteMessageSchema
  .extend({
    dataClient: voteMessageSchema.shape.dataClient.optional(),
    dataServer: z
      .object({
        imageRecord: imageRecordSchema,
        playerPublicRecord: playerPublicRecordSchema,
      })
      .optional(),
  })
  .extend(directResponseSchema.shape);

export type VoteResponse = z.infer<typeof voteResponseSchema>;
