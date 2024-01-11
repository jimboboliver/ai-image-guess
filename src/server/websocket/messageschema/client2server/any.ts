import { z } from "zod";

import { makeGameMessageSchema } from "./makeGame";
import { makeImageMessageSchema } from "./makeImage";
import { progressGameMessageSchema } from "./progressGame";
import { voteMessageSchema } from "./vote";

export const anyMessageSchema = z.union([
  progressGameMessageSchema,
  makeGameMessageSchema,
  voteMessageSchema,
  makeImageMessageSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
