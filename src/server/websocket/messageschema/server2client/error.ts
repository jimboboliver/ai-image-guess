import { z } from "zod";

export const errorSchema = z.object({
  action: z.literal("serverError"),
  data: z.object({ message: z.string() }),
});

export type ErrorMessage = z.infer<typeof errorSchema>;
