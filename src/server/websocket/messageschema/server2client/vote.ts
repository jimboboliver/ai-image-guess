import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const voteMessageSchema = z.object({
  action: z.literal("vote"),
  data: z.object({
    imageRecord: imageRecordSchema,
    connectionRecord: connectionRecordSchema,
  }),
});

export type VoteMessage = z.infer<typeof voteMessageSchema>;
