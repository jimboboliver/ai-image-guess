import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const makeGameMessageSchema = baseMessageSchema.extend({
  action: z.literal("makeGame"),
  dataClient: z.object({
    name: playerRecordSchema.shape.name,
    playerId: z.string(),
    secretId: playerRecordSchema.shape.secretId,
  }),
});

export type MakeGameMessage = z.infer<typeof makeGameMessageSchema>;
