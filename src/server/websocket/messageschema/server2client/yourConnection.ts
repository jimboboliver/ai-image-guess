import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { z } from "zod";

export const yourConnectionMessageSchema = z.object({
  action: z.literal("yourConnection"),
  data: connectionRecordSchema,
});

export type YourConnectionMessage = z.infer<typeof yourConnectionMessageSchema>;
