import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const imageGeneratedMessageSchema = z.object({
  action: z.literal("imageGenerated"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    playerRecord: playerRecordSchema,
  }),
});

export type ImageGeneratedMessage = z.infer<typeof imageGeneratedMessageSchema>;
