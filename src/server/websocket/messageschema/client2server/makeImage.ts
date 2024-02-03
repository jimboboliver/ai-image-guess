import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const makeImageMessageSchema = z.object({
  action: z.literal("makeImage"),
  data: z.object({
    promptImage: imageRecordSchema.shape.promptImage,
  }),
});

export type MakeImageMessage = z.infer<typeof makeImageMessageSchema>;
