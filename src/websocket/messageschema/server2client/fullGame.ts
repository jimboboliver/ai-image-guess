import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { handGuessPublicRecordSchema } from "~/server/db/dynamodb/handGuess";
import { handVoteRecordSchema } from "~/server/db/dynamodb/handVote";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const fullGameMessageSchema = z.object({
  action: z.literal("fullGame"),
  dataServer: z.array(
    imageRecordSchema
      .or(playerPublicRecordSchema)
      .or(gameMetaRecordSchema)
      .or(connectionRecordSchema)
      .or(handGuessPublicRecordSchema)
      .or(handVoteRecordSchema),
  ),
});

export type FullGameMessage = z.infer<typeof fullGameMessageSchema>;
