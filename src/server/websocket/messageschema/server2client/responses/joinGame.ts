import { playerRecordSchema } from "~/server/db/dynamodb/player";
import type { z } from "zod";

import { joinGameMessageSchema } from "../../client2server/joinGame";
import { directResponseSchema } from "./directResponseSchema";

export const joinGameResponseSchema = joinGameMessageSchema
  .extend({
    dataClient: joinGameMessageSchema.shape.dataClient.optional(),
    dataServer: playerRecordSchema.optional(),
  })
  .extend(directResponseSchema.shape)
  .refine((data) => {
    if (data.serverStatus === "success") {
      return data.dataServer != null;
    }
    return data.dataServer == null;
  });

export type JoinGameResponse = z.infer<typeof joinGameResponseSchema>;
