import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

import { baseMessageSchema } from "./base";

export const makeImageMessageSchema = baseMessageSchema.extend({
  action: z.literal("makeImage"),
  dataClient: z.object({
    promptImage: imageRecordSchema.shape.promptImage,
  }),
});

export type MakeImageMessage = z.infer<typeof makeImageMessageSchema>;
