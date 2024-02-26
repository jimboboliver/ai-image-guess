import type { z } from "zod";

import { progressGameMessageSchema } from "../../client2server/progressGame";
import { directResponseSchema } from "./directResponseSchema";

export const progressGameResponseSchema = progressGameMessageSchema
  .extend({
    dataClient: progressGameMessageSchema.shape.dataClient.optional(),
  })
  .extend(directResponseSchema.shape);

export type ProgressGameResponse = z.infer<typeof progressGameResponseSchema>;
