import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const imageGeneratedMessageSchema = z.object({
  action: z.literal("imageGenerated"),
  data: z.object({
    imageRecord: imageRecordSchema,
    connectionRecord: connectionRecordSchema,
  }),
});

export type ImageGeneratedMessage = z.infer<typeof imageGeneratedMessageSchema>;
