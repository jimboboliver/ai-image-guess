import { z } from "zod";

import { gameRecord } from "./game";

export const gameCodeLength = 4;

export const gameMetaRecordSchema = gameRecord.extend({
  status: z.enum(["lobby", "playing", "voting", "finished"]),
  gameCode: z.string().length(gameCodeLength),
  ownerConnectionId: z.string(),
});

export type GameMetaRecord = z.infer<typeof gameMetaRecordSchema>;
