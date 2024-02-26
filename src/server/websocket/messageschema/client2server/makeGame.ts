import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const makeGameMessageSchema = baseMessageSchema.extend({
  action: z.literal("makeGame"),
  dataClient: z.object({
    name: connectionRecordSchema.shape.name,
  }),
});

export type MakeGameMessage = z.infer<typeof makeGameMessageSchema>;
