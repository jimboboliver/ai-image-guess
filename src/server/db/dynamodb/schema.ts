import { z } from "zod";

export const gameRecord = z.object({
  game: z.string(),
  id: z.string(),
});

export type GameRecord = z.infer<typeof gameRecord>;

export const gameMetaRecordSchema = gameRecord.extend({
  status: z.enum(["lobby", "playing", "voting", "finished"]),
});

export type GameMetaRecord = z.infer<typeof gameMetaRecordSchema>;

export const connectionRecordSchema = gameRecord.extend({
  connectionId: z.string(),
});

export type ConnectionRecord = z.infer<typeof connectionRecordSchema>;

export const imageRecordSchema = gameRecord.extend({
  url: z.string(),
  connectionId: z.string(),
});

export type ImageRecord = z.infer<typeof imageRecordSchema>;
