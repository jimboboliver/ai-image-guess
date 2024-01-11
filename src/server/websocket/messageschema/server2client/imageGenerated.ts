import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const imageGeneratedMessageSchema = z.object({
  action: z.literal("imageGenerated"),
  data: imageRecordSchema,
});

export type ImageGeneratedMessage = z.infer<typeof imageGeneratedMessageSchema>;
