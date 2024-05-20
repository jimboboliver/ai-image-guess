import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { handGuessPublicRecordSchema } from "~/server/db/dynamodb/handGuess";
import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const newPlayerMessageSchema = z.object({
  action: z.literal("newPlayer"),
  dataServer: z.object({
    playerPublicRecord: playerPublicRecordSchema,
    connectionRecord: connectionRecordSchema,
    handPublicRecord: handGuessPublicRecordSchema.or(handVoteRecordSchema),
  }),
});

export type NewPlayerMessage = z.infer<typeof newPlayerMessageSchema>;
