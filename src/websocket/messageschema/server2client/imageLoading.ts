import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const imageLoadingMessageSchema = z.object({
  action: z.literal("imageLoading"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    playerPublicRecord: playerPublicRecordSchema,
  }),
});

export type ImageLoadingMessage = z.infer<typeof imageLoadingMessageSchema>;
