import { lobbyMetaRecordSchema } from "~/server/db/dynamodb/lobbyMeta";
import { z } from "zod";

export const progressedLobbyMessageSchema = z.object({
  action: z.literal("progressedLobby"),
  dataServer: lobbyMetaRecordSchema,
});

export type ProgressedLobbyMessage = z.infer<
  typeof progressedLobbyMessageSchema
>;
