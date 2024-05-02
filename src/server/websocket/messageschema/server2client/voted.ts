import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const votedMessageSchema = z.object({
  action: z.literal("voted"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    handRecord: handVoteRecordSchema,
  }),
});

export type VotedMessage = z.infer<typeof votedMessageSchema>;
