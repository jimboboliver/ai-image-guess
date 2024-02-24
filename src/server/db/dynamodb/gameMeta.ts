import { z } from "zod";

import { baseRecord } from "./base";

export const gameCodeLength = 4;

export const gameMetaRecordSchema = baseRecord.extend({
  status: z.enum(["lobby", "playing", "finished"]),
  gameCode: z.string().length(gameCodeLength),
  ownerConnectionId: z.string(),
  timestamps: z
    .object({
      timestampEndPlay: z.number(),
      timestampEndVote: z.number(),
    })
    .optional(),
  gameType: z.string(),
});

export type GameMetaRecord = z.infer<typeof gameMetaRecordSchema>;
