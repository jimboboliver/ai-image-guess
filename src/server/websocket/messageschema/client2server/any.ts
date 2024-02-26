import { z } from "zod";

import { joinGameMessageSchema } from "./joinGame";
import { makeGameMessageSchema } from "./makeGame";
import { makeImageMessageSchema } from "./makeImage";
import { progressGameMessageSchema } from "./progressGame";
import { voteMessageSchema } from "./vote";

export const anyClientMessageSchema = z.union([
  progressGameMessageSchema,
  makeGameMessageSchema,
  voteMessageSchema,
  makeImageMessageSchema,
  joinGameMessageSchema,
]);

export type AnyClientMessage = z.infer<typeof anyClientMessageSchema>;
