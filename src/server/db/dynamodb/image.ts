import { z } from "zod";

import { baseRecord } from "./base";

export const promptImageMinLength = 1;
export const promptImageMaxLength = 256;

export const imageRecordSchema = baseRecord.extend({
  url: z.string().optional(),
  connectionId: z.string(),
  votes: z.number().optional(),
  promptImage: z.string().min(promptImageMinLength).max(promptImageMaxLength),
  loading: z.boolean(),
  error: z.boolean().optional(),
});

export type ImageRecord = z.infer<typeof imageRecordSchema>;
