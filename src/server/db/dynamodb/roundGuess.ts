import { z } from "zod";

import { roundRecordSchema } from "./round";

export const roundGuessRecordSchema = roundRecordSchema.extend({
  timestamps: z.object({
    timestampEndGenerate: z.number(),
    timestampEndGuess: z.number(),
  }),
  gameType: z.literal("guess"),
});

export type RoundGuessRecord = z.infer<typeof roundGuessRecordSchema>;
