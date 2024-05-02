import { z } from "zod";

import { handBaseRecordSchema } from "./handBase";

export const handGuessRecordSchema = handBaseRecordSchema.extend({
  words: z.array(z.string()),
  imageId: z.string().optional(),
  promptImageGuesses: z.record(z.string()).optional(),
});

export type HandGuessRecord = z.infer<typeof handGuessRecordSchema>;

export const handGuessPublicRecordSchema = handGuessRecordSchema.omit({
  words: true,
});

export type HandGuessPublicRecord = z.infer<typeof handGuessPublicRecordSchema>;
