import { z } from "zod";

import { deleteConnectionMessageSchema } from "./deleteConnection";
import { fullLobbyMessageSchema } from "./fullLobby";
import { goToLobbyMessageSchema } from "./goToLobby";
import { imageErrorMessageSchema } from "./imageError";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { imageLoadingMessageSchema } from "./imageLoading";
import { internalServerErrorMessageSchema } from "./internalServerError";
import { newPlayerMessageSchema } from "./newPlayer";
import { goToLobbyResponseSchema } from "./responses/goToLobby";
import { joinLobbyResponseSchema } from "./responses/joinLobby";
import { makeImageResponseSchema } from "./responses/makeImage";
import { makeLobbyResponseSchema } from "./responses/makeLobby";
import { startRoundResponseSchema } from "./responses/startRound";
import { voteResponseSchema } from "./responses/vote";
import { startRoundMessageSchema } from "./startRound";
import { votedMessageSchema } from "./voted";

export const anyServerMessageSchema = z.union([
  // broadcast
  fullLobbyMessageSchema,
  imageLoadingMessageSchema,
  imageErrorMessageSchema,
  imageGeneratedMessageSchema,
  startRoundMessageSchema,
  votedMessageSchema,
  newPlayerMessageSchema,
  deleteConnectionMessageSchema,
  goToLobbyMessageSchema,
  // client2server message response
  internalServerErrorMessageSchema,
  makeLobbyResponseSchema,
  joinLobbyResponseSchema,
  startRoundResponseSchema,
  makeImageResponseSchema,
  voteResponseSchema,
  goToLobbyResponseSchema,
]);

export type AnyServerMessage = z.infer<typeof anyServerMessageSchema>;
