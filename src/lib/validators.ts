import { z } from "zod";

export const ingestEventSchema = z.object({
  dsn: z.string().min(1),
  type: z.string().default("error"),
  message: z.string().min(1),
  stacktrace: z.string().optional(),
  release: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export type IngestEventInput = z.infer<typeof ingestEventSchema>;
