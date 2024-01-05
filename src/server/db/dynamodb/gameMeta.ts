import { z } from "zod";

import { gameRecord } from "./game";

export const gameMetaRecordSchema = gameRecord.extend({
  status: z.enum(["lobby", "playing", "voting", "finished"]),
});

export type GameMetaRecord = z.infer<typeof gameMetaRecordSchema>;
