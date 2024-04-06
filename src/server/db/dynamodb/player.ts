import { z } from "zod";

import { baseRecord } from "./base";

export const nameMinLength = 1;
export const nameMaxLength = 10;

export const playerRecordSchema = baseRecord.extend({
  name: z.string().min(nameMinLength).max(nameMaxLength),
  imageId: z.string().optional(),
  votedImageId: z.string().optional(),
});

export type PlayerRecord = z.infer<typeof playerRecordSchema>;
