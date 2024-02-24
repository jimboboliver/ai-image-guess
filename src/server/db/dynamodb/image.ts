import { z } from "zod";

import { baseRecord } from "./base";

export const promptImageMaxLength = 256;

export const imageRecordSchema = baseRecord.extend({
  url: z.string(),
  connectionId: z.string(),
  votes: z.number().optional(),
  promptImage: z.string().min(1).max(promptImageMaxLength),
});

export type ImageRecord = z.infer<typeof imageRecordSchema>;
