import { playerRecordSchema } from "~/server/db/dynamodb/player";
import { z } from "zod";

export const deletePlayerMessageSchema = z.object({
  action: z.literal("deletePlayer"),
  dataServer: playerRecordSchema,
});

export type DeletePlayerMessage = z.infer<typeof deletePlayerMessageSchema>;
