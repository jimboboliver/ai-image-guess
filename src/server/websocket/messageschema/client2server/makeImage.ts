import { z } from "zod";

export const makeImageMessageSchema = z.object({
  action: z.literal("joinGame"),
  data: z.object({
    promptImage: z.string(),
  }),
});

export type MakeImageMessage = z.infer<typeof makeImageMessageSchema>;
