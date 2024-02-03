import { z } from "zod";

import { gameRecord } from "./game";

export const promptImageMaxLength = 256;

export const imageRecordSchema = gameRecord.extend({
  url: z.string(),
  connectionId: z.string(),
  votes: z.number().optional(),
  promptImage: z.string().min(1).max(promptImageMaxLength),
});

export type ImageRecord = z.infer<typeof imageRecordSchema>;
