import { z } from "zod";

import { gameRecord } from "./game";

export const nameMaxLength = 10;

export const connectionRecordSchema = gameRecord.extend({
  name: z.string().min(1).max(nameMaxLength),
});

export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;
