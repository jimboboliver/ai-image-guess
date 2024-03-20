import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { z } from "zod";

export const imageErrorMessageSchema = z.object({
  action: z.literal("imageError"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    connectionRecord: connectionRecordSchema,
  }),
});

export type ImageErrorMessage = z.infer<typeof imageErrorMessageSchema>;
