import { z } from "zod";

export const rewriteRequestSchema = z.object({
  projectId: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),
  voiceProfileId: z.string().uuid().optional(),
  goal: z.enum(["NATURAL", "CONCISE", "PROFESSIONAL", "PERSONAL", "MATCH_SAMPLES"]),
  readingLevel: z.string().min(2).max(32),
  tone: z.string().min(2).max(32),
  formality: z.number().int().min(1).max(5),
  aggressiveness: z.number().int().min(1).max(5),
  preserveTerminology: z.boolean().default(true),
  preserveSentenceStructure: z.boolean().default(false),
  preserveCitation: z.boolean().default(true),
  optionsCount: z.number().int().min(1).max(3).default(2),
  lockedSentences: z.array(z.number().int().min(0)).default([]),
  lockedTerms: z.array(z.string().min(1)).default([])
});
