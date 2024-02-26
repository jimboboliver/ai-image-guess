import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { z } from "zod";

export const newConnectionMessageSchema = z.object({
  action: z.literal("newConnection"),
  dataServer: connectionRecordSchema,
});

export type NewConnectionMessage = z.infer<typeof newConnectionMessageSchema>;
