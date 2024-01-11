import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const voteMessageSchema = z.object({
  action: z.literal("vote"),
  data: imageRecordSchema,
});

export type VoteMessage = z.infer<typeof voteMessageSchema>;
