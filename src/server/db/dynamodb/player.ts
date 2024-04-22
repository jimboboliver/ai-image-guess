import { z } from "zod";

import { baseRecord } from "./base";

export const nameMinLength = 1;
export const nameMaxLength = 10;

export const playerRecordSchema = baseRecord.extend({
  secretId: z.string(), // for auth
  name: z.string().min(nameMinLength).max(nameMaxLength),
  imageId: z.string().optional(),
  votedImageId: z.string().optional(),
});

export type PlayerRecord = z.infer<typeof playerRecordSchema>;

export const playerPublicRecordSchema = playerRecordSchema.omit({
  secretId: true,
});

export type PlayerPublicRecord = z.infer<typeof playerPublicRecordSchema>;
