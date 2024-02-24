import { z } from "zod";

export const successSchema = z.object({
  action: z.literal("serverSuccess"),
});

export type SuccessMessage = z.infer<typeof successSchema>;
