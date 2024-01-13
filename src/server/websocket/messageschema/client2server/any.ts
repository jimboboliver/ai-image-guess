import { z } from "zod";

import { joinGameMessageSchema } from "./joinGame";
import { makeGameMessageSchema } from "./makeGame";
import { makeImageMessageSchema } from "./makeImage";
import { progressGameMessageSchema } from "./progressGame";
import { voteMessageSchema } from "./vote";

export const anyMessageSchema = z.union([
  progressGameMessageSchema,
  makeGameMessageSchema,
  voteMessageSchema,
  makeImageMessageSchema,
  joinGameMessageSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
