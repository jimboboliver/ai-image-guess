import { z } from "zod";

import { deleteConnectionMessageSchema } from "./deleteConnection";
import { errorMessageSchema } from "./errorSchema";
import { fullGameMessageSchema } from "./fullGame";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { newConnectionMessageSchema } from "./newConnection";
import { progressGameMessageSchema } from "./progressGame";
import { voteMessageSchema } from "./vote";
import { yourConnectionMessageSchema } from "./yourConnection";

export const anyMessageSchema = z.union([
  fullGameMessageSchema,
  imageGeneratedMessageSchema,
  progressGameMessageSchema,
  voteMessageSchema,
  newConnectionMessageSchema,
  deleteConnectionMessageSchema,
  yourConnectionMessageSchema,
  errorMessageSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
