import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { z } from "zod";

export const deleteConnectionMessageSchema = z.object({
  action: z.literal("deleteConnection"),
  data: connectionRecordSchema,
});

export type DeleteConnectionMessage = z.infer<
  typeof deleteConnectionMessageSchema
>;
