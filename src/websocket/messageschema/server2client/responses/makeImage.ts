import type { z } from "zod";

import { makeImageMessageSchema } from "../../client2server/makeImage";
import { directResponseSchema } from "./directResponseSchema";

export const makeImageResponseSchema = makeImageMessageSchema
  .extend({
    dataClient: makeImageMessageSchema.shape.dataClient.optional(),
  })
  .extend(directResponseSchema.shape);

export type MakeImageResponse = z.infer<typeof makeImageResponseSchema>;
