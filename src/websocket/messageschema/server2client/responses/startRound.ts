import type { z } from "zod";

import { startRoundMessageSchema } from "../../client2server/startRound";
import { directResponseSchema } from "./directResponseSchema";

export const startRoundResponseSchema = startRoundMessageSchema
  .extend({
    dataClient: startRoundMessageSchema.shape.dataClient.optional(),
  })
  .extend(directResponseSchema.shape);

export type StartRoundResponse = z.infer<typeof startRoundResponseSchema>;
