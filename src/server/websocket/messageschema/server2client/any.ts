import { z } from "zod";

import { deleteConnectionMessageSchema } from "./deleteConnection";
import { errorSchema } from "./error";
import { fullGameMessageSchema } from "./fullGame";
import { imageGeneratedMessageSchema } from "./imageGenerated";
import { internalServerErrorMessageSchema } from "./internalServerError";
import { newConnectionMessageSchema } from "./newConnection";
import { progressGameMessageSchema } from "./progressGame";
import { successSchema } from "./success";
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
  internalServerErrorMessageSchema,
  errorSchema,
  successSchema,
]);

export type AnyMessage = z.infer<typeof anyMessageSchema>;
