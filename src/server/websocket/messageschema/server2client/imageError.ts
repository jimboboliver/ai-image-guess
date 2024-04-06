import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const imageErrorMessageSchema = z.object({
  action: z.literal("imageError"),
  dataServer: z.object({
    imageRecord: imageRecordSchema,
    playerRecord: playerRecordSchema,
  }),
});

export type ImageErrorMessage = z.infer<typeof imageErrorMessageSchema>;
