import type { z } from "zod";

import { baseRecord } from "./base";

export const roundRecordSchema = baseRecord.extend({});

export type RoundRecord = z.infer<typeof roundRecordSchema>;
