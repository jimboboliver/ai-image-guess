import { z } from "zod";

import { baseMessageSchema } from "../../client2server/base";

export const directResponseSchema = z.object({
  serverStatus: z.enum(["success", "bad request"]),
  messageId: baseMessageSchema.shape.messageId,
});
