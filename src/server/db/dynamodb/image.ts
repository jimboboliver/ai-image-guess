import { z } from "zod";

import { gameRecord } from "./game";

export const imageRecordSchema = gameRecord.extend({
  url: z.string(),
  connectionId: z.string(),
  votes: z.number().optional(),
});

export type ImageRecord = z.infer<typeof imageRecordSchema>;
