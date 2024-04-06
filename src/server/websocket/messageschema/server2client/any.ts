import { z } from "zod";

import { deletePlayerMessageSchema } from "./deletePlayer";
import { fullGameMessageSchema } from "./fullGame";
import { imageErrorMessageSchema } from "./imageError";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { imageLoadingMessageSchema } from "./imageLoading";
import { internalServerErrorMessageSchema } from "./internalServerError";
import { newPlayerMessageSchema } from "./newPlayer";
import { progressedGameMessageSchema } from "./progressedGame";
import { joinGameResponseSchema } from "./responses/joinGame";
import { makeGameResponseSchema } from "./responses/makeGame";
import { makeImageResponseSchema } from "./responses/makeImage";
import { progressGameResponseSchema } from "./responses/progressGame";
import { voteResponseSchema } from "./responses/vote";
import { votedMessageSchema } from "./voted";

export const anyServerMessageSchema = z.union([
  // broadcast
  fullGameMessageSchema,
  imageLoadingMessageSchema,
  imageErrorMessageSchema,
  imageGeneratedMessageSchema,
  progressedGameMessageSchema,
  votedMessageSchema,
  newPlayerMessageSchema,
  deletePlayerMessageSchema,
  // client2server message response
  internalServerErrorMessageSchema,
  joinGameResponseSchema,
  makeGameResponseSchema,
  makeImageResponseSchema,
  progressGameResponseSchema,
  voteResponseSchema,
]);

export type AnyServerMessage = z.infer<typeof anyServerMessageSchema>;
