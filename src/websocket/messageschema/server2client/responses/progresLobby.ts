import type { z } from "zod";

import { progressLobbyMessageSchema } from "../../client2server/progressLobby";
import { directResponseSchema } from "./directResponseSchema";

export const progressLobbyResponseSchema = progressLobbyMessageSchema
  .extend({
    dataClient: progressLobbyMessageSchema.shape.dataClient.optional(),
  })
  .extend(directResponseSchema.shape);

export type ProgressLobbyResponse = z.infer<typeof progressLobbyResponseSchema>;
