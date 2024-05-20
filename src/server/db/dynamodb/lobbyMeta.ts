import { z } from "zod";

import { baseRecord } from "./base";

export const lobbyCodeLength = 4;

export const lobbyMetaRecordSchema = baseRecord.extend({
  status: z.enum(["lobby", "playing", "finished"]),
  lobbyCode: z.string().length(lobbyCodeLength),
  ownerConnectionId: z.string(),
  timestamps: z
    .object({
      timestampEndPlay: z.number(),
      timestampEndVote: z.number(),
    })
    .optional(),
  gameType: z.enum(["vote", "guess"]),
});

export type LobbyMetaRecord = z.infer<typeof lobbyMetaRecordSchema>;
