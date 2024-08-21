import { z } from "zod";

import { baseMessageSchema } from "./base";

export const goToLobbyMessageSchema = baseMessageSchema.extend({
  action: z.literal("goToLobby"),
  dataClient: z.object({}),
});

export type GoToLobbyMessage = z.infer<typeof goToLobbyMessageSchema>;
