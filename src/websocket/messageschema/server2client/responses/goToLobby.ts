import type { z } from "zod";

import { goToLobbyMessageSchema } from "../../client2server/goToLobby";
import { directResponseSchema } from "./directResponseSchema";

export const goToLobbyResponseSchema = goToLobbyMessageSchema
  .extend({
    dataClient: goToLobbyMessageSchema.shape.dataClient.optional(),
  })
  .extend(directResponseSchema.shape);

export type GoToLobbyResponse = z.infer<typeof goToLobbyResponseSchema>;
