import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const imageLoadingMessageSchema = z.object({
  action: z.literal("imageLoading"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    connectionRecord: connectionRecordSchema,
  }),
});

export type ImageLoadingMessage = z.infer<typeof imageLoadingMessageSchema>;
