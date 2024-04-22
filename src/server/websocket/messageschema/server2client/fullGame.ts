import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { gameMetaRecordSchema } from "~/server/db/dynamodb/gameMeta";
import { imageRecordSchema } from "~/server/db/dynamodb/image";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const fullGameMessageSchema = z.object({
  action: z.literal("fullGame"),
  dataServer: z.array(
    imageRecordSchema
      .or(playerPublicRecordSchema)
      .or(gameMetaRecordSchema)
      .or(connectionRecordSchema),
  ),
});

export type FullGameMessage = z.infer<typeof fullGameMessageSchema>;
