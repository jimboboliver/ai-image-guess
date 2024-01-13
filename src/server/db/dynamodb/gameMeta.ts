import { z } from "zod";

import { gameRecord } from "./game";

export const gameMetaRecordSchema = gameRecord.extend({
  status: z.enum(["lobby", "playing", "voting", "finished"]),
  gameCode: z.string(),
  ownerConnectionId: z.string(),
});

export type GameMetaRecord = z.infer<typeof gameMetaRecordSchema>;
