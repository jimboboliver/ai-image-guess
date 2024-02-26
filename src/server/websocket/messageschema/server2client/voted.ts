import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const votedMessageSchema = z.object({
  action: z.literal("voted"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    connectionRecord: connectionRecordSchema,
  }),
});

export type VotedMessage = z.infer<typeof votedMessageSchema>;
