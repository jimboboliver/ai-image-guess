import { z } from "zod";

import { baseRecord } from "./base";

export const handBaseRecordSchema = baseRecord.extend({
  playerId: z.string(),
});

export type HandBaseRecord = z.infer<typeof handBaseRecordSchema>;
