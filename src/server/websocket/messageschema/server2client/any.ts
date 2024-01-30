import { z } from "zod";

import { fullGameMessageSchema } from "./fullGame";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { newConnectionMessageSchema } from "./newConnection";
import { progressGameMessageSchema } from "./progressGame";
import { voteMessageSchema } from "./vote";

export const anyMessageSchema = z.union([
  fullGameMessageSchema,
  imageGeneratedMessageSchema,
  progressGameMessageSchema,
  voteMessageSchema,
  newConnectionMessageSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
