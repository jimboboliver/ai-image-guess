import { z } from "zod";

export const joinGameMessageSchema = z.object({
  action: z.literal("joinGame"),
  data: z.object({
    gameCode: z.string(),
    name: z.string(),
  }),
});

export type JoinGameMessage = z.infer<typeof joinGameMessageSchema>;
