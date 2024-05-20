import { lobbyMetaRecordSchema } from "~/server/db/dynamodb/lobbyMeta";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const progressLobbyMessageSchema = baseMessageSchema.extend({
  action: z.literal("progressLobby"),
  dataClient: z.object({
    status: lobbyMetaRecordSchema.shape.status,
  }),
});

export type ProgressLobbyMessage = z.infer<typeof progressLobbyMessageSchema>;
