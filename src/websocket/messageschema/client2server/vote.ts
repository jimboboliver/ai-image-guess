import { z } from "zod";

import { baseMessageSchema } from "./base";

export const voteMessageSchema = baseMessageSchema.extend({
  action: z.literal("vote"),
  dataClient: z.object({
    imageId: z.string(),
    playerId: z.string(),
    secretId: z.string(),
  }),
});

export type VoteMessage = z.infer<typeof voteMessageSchema>;
