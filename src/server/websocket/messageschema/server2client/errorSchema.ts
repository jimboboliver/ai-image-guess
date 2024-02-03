import { z } from "zod";

export const errorMessageSchema = z.object({
  message: z.string(),
  connectionId: z.string(),
  requestId: z.string(),
});

export type ErrorMessage = z.infer<typeof errorMessageSchema>;
