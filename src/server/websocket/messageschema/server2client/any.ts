import { z } from "zod";

import { fullGameMessageSchema } from "./fullGame";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { progressGameMessageSchema } from "./progressGame";
import { voteMessageSchema } from "./vote";

export const anyMessageSchema = z.union([
  fullGameMessageSchema,
  imageGeneratedMessageSchema,
  progressGameMessageSchema,
  voteMessageSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
