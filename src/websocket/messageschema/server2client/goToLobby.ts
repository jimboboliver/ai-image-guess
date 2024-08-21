import { lobbyMetaRecordSchema } from "~/server/db/dynamodb/lobbyMeta";
import { z } from "zod";

export const goToLobbyMessageSchema = z.object({
  action: z.literal("goToLobby"),
  dataServer: lobbyMetaRecordSchema,
});

export type GoToLobbyMessage = z.infer<typeof goToLobbyMessageSchema>;
