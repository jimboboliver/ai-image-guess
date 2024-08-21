import { z } from "zod";

import { roundRecordSchema } from "./round";

export const roundVoteRecordSchema = roundRecordSchema.extend({
  timestamps: z.object({
    timestampEndGenerate: z.number(),
    timestampEndVote: z.number(),
  }),
  gameType: z.literal("vote"),
});

export type RoundVoteRecord = z.infer<typeof roundVoteRecordSchema>;
