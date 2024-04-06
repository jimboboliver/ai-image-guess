import type { z } from "zod";

import { baseRecord } from "./base";

export const connectionRecordSchema = baseRecord.extend({});

export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;
