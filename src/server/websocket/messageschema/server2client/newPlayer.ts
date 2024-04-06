import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const newPlayerMessageSchema = z.object({
  action: z.literal("newPlayer"),
  dataServer: playerRecordSchema,
});

export type NewPlayerMessage = z.infer<typeof newPlayerMessageSchema>;
