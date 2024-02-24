import { z } from "zod";

export const internalServerErrorMessageSchema = z.object({
  message: z.string(),
  connectionId: z.string(),
  requestId: z.string(),
});

export type InternalServerErrorMessage = z.infer<
  typeof internalServerErrorMessageSchema
>;
