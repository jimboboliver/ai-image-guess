import { z } from "zod";

import { deleteConnectionMessageSchema } from "./deleteConnection";
import { fullLobbyMessageSchema } from "./fullLobby";
import { imageErrorMessageSchema } from "./imageError";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { imageLoadingMessageSchema } from "./imageLoading";
import { internalServerErrorMessageSchema } from "./internalServerError";
import { newPlayerMessageSchema } from "./newPlayer";
import { progressedLobbyMessageSchema } from "./progressedLobby";
import { joinLobbyResponseSchema } from "./responses/joinLobby";
import { makeImageResponseSchema } from "./responses/makeImage";
import { makeLobbyResponseSchema } from "./responses/makeLobby";
import { progressLobbyResponseSchema } from "./responses/progresLobby";
import { voteResponseSchema } from "./responses/vote";
import { votedMessageSchema } from "./voted";

export const anyServerMessageSchema = z.union([
  // broadcast
  fullLobbyMessageSchema,
  imageLoadingMessageSchema,
  imageErrorMessageSchema,
  imageGeneratedMessageSchema,
  progressedLobbyMessageSchema,
  votedMessageSchema,
  newPlayerMessageSchema,
  deleteConnectionMessageSchema,
  // client2server message response
  internalServerErrorMessageSchema,
  joinLobbyResponseSchema,
  makeLobbyResponseSchema,
  makeImageResponseSchema,
  progressLobbyResponseSchema,
  voteResponseSchema,
]);

export type AnyServerMessage = z.infer<typeof anyServerMessageSchema>;
