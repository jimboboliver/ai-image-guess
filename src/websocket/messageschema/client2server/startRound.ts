import { roundGuessRecordSchema } from "~/server/db/dynamodb/roundGuess";
import { roundVoteRecordSchema } from "~/server/db/dynamodb/roundVote";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const startRoundMessageSchema = baseMessageSchema.extend({
  action: z.literal("startRound"),
  dataClient: z.object({
    gameType: z.union([
      roundVoteRecordSchema.shape.gameType,
      roundGuessRecordSchema.shape.gameType,
    ]),
  }),
});

export type StartRoundMessage = z.infer<typeof startRoundMessageSchema>;
