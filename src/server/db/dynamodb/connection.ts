import { z } from "zod";

import { baseRecord } from "./base";

export const connectionRecordSchema = baseRecord.extend({
  playerId: z.string(),
});

export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;
