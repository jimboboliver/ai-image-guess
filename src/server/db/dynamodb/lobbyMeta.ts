import { z } from "zod";

import { baseRecord } from "./base";

export const lobbyCodeLength = 4;

export const lobbyMetaRecordSchema = baseRecord.extend({
  status: z.enum(["lobby", "playing"]),
  lobbyCode: z.string().length(lobbyCodeLength),
  ownerPlayerId: z.string(),
  roundIds: z.array(z.string()),
});

export type LobbyMetaRecord = z.infer<typeof lobbyMetaRecordSchema>;
