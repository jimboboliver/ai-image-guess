import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const votedMessageSchema = z.object({
  action: z.literal("voted"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    playerPublicRecord: playerPublicRecordSchema,
  }),
});

export type VotedMessage = z.infer<typeof votedMessageSchema>;
