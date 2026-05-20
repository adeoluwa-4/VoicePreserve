import { describe, expect, it, vi } from "vitest";
import { generateRevision } from "@/lib/services/rewrite";

describe("rewrite service", () => {
  it("creates multiple revision options with sentence diffs", async () => {
    const created: Array<Record<string, unknown>> = [];

    const prisma = {
      sourceDocument: {
        findUnique: vi.fn().mockResolvedValue({ id: "doc-1", content: "We might launch this in April." })
      },
      revision: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const revision = {
            id: `rev-${created.length + 1}`,
            ...data,
            sentenceDiffs: data.sentenceDiffs.create
          };
          created.push(revision);
          return revision;
        })
      }
    } as any;

    const revisions = await generateRevision(prisma, {
      projectId: "project-1",
      sourceDocumentId: "doc-1",
      userId: "user-1",
      goal: "NATURAL",
      readingLevel: "grade8",
      tone: "confident",
      formality: 3,
      aggressiveness: 2,
      preserveTerminology: true,
      preserveSentenceStructure: false,
      preserveCitation: true,
      optionsCount: 2,
      lockedSentences: [],
      lockedTerms: []
    });

    expect(revisions).toHaveLength(2);
    expect(created[0].sentenceDiffs).toBeDefined();
  });
});
