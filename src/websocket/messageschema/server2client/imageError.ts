import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const imageErrorMessageSchema = z.object({
  action: z.literal("imageError"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    playerPublicRecord: playerPublicRecordSchema,
  }),
});

export type ImageErrorMessage = z.infer<typeof imageErrorMessageSchema>;
