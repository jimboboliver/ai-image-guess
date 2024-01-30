import { z } from "zod";

import { deleteConnectionMessageSchema } from "./deleteConnection";
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
  deleteConnectionMessageSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
