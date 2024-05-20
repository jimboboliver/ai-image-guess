import { z } from "zod";

import { joinLobbyMessageSchema } from "./joinLobby";
import { makeImageMessageSchema } from "./makeImage";
import { makeLobbyMessageSchema } from "./makeLobby";
import { progressLobbyMessageSchema } from "./progressLobby";
import { voteMessageSchema } from "./vote";

export const anyClientMessageSchema = z.union([
  progressLobbyMessageSchema,
  makeLobbyMessageSchema,
  voteMessageSchema,
  makeImageMessageSchema,
  joinLobbyMessageSchema,
]);

export type AnyClientMessage = z.infer<typeof anyClientMessageSchema>;
