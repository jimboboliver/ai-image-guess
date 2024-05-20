import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const makeLobbyMessageSchema = baseMessageSchema.extend({
  action: z.literal("makeLobby"),
  dataClient: z.object({
    name: playerRecordSchema.shape.name,
    playerId: z.string(),
    secretId: playerRecordSchema.shape.secretId,
  }),
});

export type MakeLobbyMessage = z.infer<typeof makeLobbyMessageSchema>;
