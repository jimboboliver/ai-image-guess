import { connectionRecordSchema } from "~/server/db/dynamodb/connection";
import type { z } from "zod";

import { makeGameMessageSchema } from "../../client2server/makeGame";
import { directResponseSchema } from "./directResponseSchema";

export const makeGameResponseSchema = makeGameMessageSchema
  .extend({
    dataClient: makeGameMessageSchema.shape.dataClient.optional(),
    dataServer: connectionRecordSchema.optional(),
  })
  .extend(directResponseSchema.shape)
  .refine((data) => {
    if (data.serverStatus === "success") {
      return data.dataServer != null;
    }
    return data.dataServer == null;
  });

export type MakeGameResponse = z.infer<typeof makeGameResponseSchema>;
