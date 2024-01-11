import { z } from "zod";

export const makeGameMessageSchema = z.object({
  action: z.literal("joinGame"),
  data: z.object({
    name: z.string(),
  }),
});

export type MakeGameMessage = z.infer<typeof makeGameMessageSchema>;
