import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import { z } from "zod";

export const makeGameMessageSchema = z.object({
  action: z.literal("makeGame"),
  data: z.object({
    name: connectionRecordSchema.shape.name,
  }),
});

export type MakeGameMessage = z.infer<typeof makeGameMessageSchema>;
