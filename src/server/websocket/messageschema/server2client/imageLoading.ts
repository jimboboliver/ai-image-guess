import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const imageLoadingMessageSchema = z.object({
  action: z.literal("imageLoading"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    playerRecord: playerRecordSchema,
  }),
});

export type ImageLoadingMessage = z.infer<typeof imageLoadingMessageSchema>;
