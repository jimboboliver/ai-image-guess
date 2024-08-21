import { z } from "zod";

import { goToLobbyMessageSchema } from "./goToLobby";
import { joinLobbyMessageSchema } from "./joinLobby";
import { makeImageMessageSchema } from "./makeImage";
import { makeLobbyMessageSchema } from "./makeLobby";
import { startRoundMessageSchema } from "./startRound";
import { voteMessageSchema } from "./vote";

export const anyClientMessageSchema = z.union([
  makeLobbyMessageSchema,
  joinLobbyMessageSchema,
  startRoundMessageSchema,
  makeImageMessageSchema,
  voteMessageSchema,
  goToLobbyMessageSchema,
]);

export type AnyClientMessage = z.infer<typeof anyClientMessageSchema>;
