import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { playerPublicRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const newPlayerMessageSchema = z.object({
  action: z.literal("newPlayer"),
  dataServer: z.object({
    playerPublicRecord: playerPublicRecordSchema,
    connectionRecord: connectionRecordSchema,
  }),
});

export type NewPlayerMessage = z.infer<typeof newPlayerMessageSchema>;
