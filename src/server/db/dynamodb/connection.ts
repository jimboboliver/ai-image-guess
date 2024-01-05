import { z } from "zod";

import { gameRecord } from "./game";

export const connectionRecordSchema = gameRecord.extend({
  connectionId: z.string(),
  name: z.string(),
});

export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;
