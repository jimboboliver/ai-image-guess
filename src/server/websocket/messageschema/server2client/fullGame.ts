import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const fullGameMessageSchema = z.object({
  action: z.literal("fullGame"),
  dataServer: z.array(
    imageRecordSchema.or(playerRecordSchema).or(gameMetaRecordSchema),
  ),
});

export type FullGameMessage = z.infer<typeof fullGameMessageSchema>;
