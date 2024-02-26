import { z } from "zod";

import { deleteConnectionMessageSchema } from "./deleteConnection";
import { fullGameMessageSchema } from "./fullGame";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { internalServerErrorMessageSchema } from "./internalServerError";
import { newConnectionMessageSchema } from "./newConnection";
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
  imageGeneratedMessageSchema,
  progressedGameMessageSchema,
  votedMessageSchema,
  newConnectionMessageSchema,
  deleteConnectionMessageSchema,
  // client2server message response
  internalServerErrorMessageSchema,
  joinGameResponseSchema,
  makeGameResponseSchema,
  makeImageResponseSchema,
  progressGameResponseSchema,
  voteResponseSchema,
]);

export type AnyServerMessage = z.infer<typeof anyServerMessageSchema>;
