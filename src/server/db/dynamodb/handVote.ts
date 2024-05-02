import { z } from "zod";

import { handBaseRecordSchema } from "./handBase";

export const handVoteRecordSchema = handBaseRecordSchema.extend({
  imageId: z.string().optional(),
  votedImageId: z.string().optional(),
});

export type HandVoteRecord = z.infer<typeof handVoteRecordSchema>;
