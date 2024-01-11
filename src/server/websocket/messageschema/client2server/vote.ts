import { z } from "zod";

export const voteMessageSchema = z.object({
  action: z.literal("vote"),
  data: z.object({
    imageId: z.string(),
  }),
});

export type VoteMessage = z.infer<typeof voteMessageSchema>;
