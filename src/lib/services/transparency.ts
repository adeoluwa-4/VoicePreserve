import type { SentenceDiff } from "@prisma/client";

export function buildTransparencyReport(params: {
  draftCreatedAt: Date;
  rewriteRequestedAt: Date;
  sentenceDiffs: SentenceDiff[];
  usedWritingSamples: boolean;
}) {
  const { draftCreatedAt, rewriteRequestedAt, sentenceDiffs, usedWritingSamples } = params;

  const heavilyChangedSections = sentenceDiffs
    .filter((item) => item.semanticScore < 0.75)
    .map((item) => ({ sentenceIndex: item.sentenceIndex, semanticScore: item.semanticScore }));

  return {
    draftCreatedAt: draftCreatedAt.toISOString(),
    rewriteRequestedAt: rewriteRequestedAt.toISOString(),
    editCount: sentenceDiffs.length,
    heavilyChangedSections,
    usedWritingSamples,
    checkpoints: [
      { label: "Draft created", at: draftCreatedAt.toISOString() },
      { label: "Rewrite requested", at: rewriteRequestedAt.toISOString() },
      { label: "Revision reviewed", at: new Date().toISOString() }
    ]
  };
}
