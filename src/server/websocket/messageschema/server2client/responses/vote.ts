import type { z } from "zod";

import { voteMessageSchema } from "../../client2server/vote";
import { directResponseSchema } from "./directResponseSchema";

export const voteResponseSchema = voteMessageSchema
  .extend({
    dataClient: voteMessageSchema.shape.dataClient.optional(),
  })
  .extend(directResponseSchema.shape);

export type VoteResponse = z.infer<typeof voteResponseSchema>;
