import { Prisma, PrismaClient, RevisionGoal } from "@prisma/client";
import { MockRewriteProvider } from "@/lib/ai/mock-provider";
import { analyzeSemanticFidelity } from "@/lib/services/semantic";

const provider = new MockRewriteProvider();

interface RewriteInput {
  projectId: string;
  sourceDocumentId: string;
  userId: string;
  voiceProfileId?: string;
  goal: RevisionGoal;
  readingLevel: string;
  tone: string;
  formality: number;
  aggressiveness: number;
  preserveTerminology: boolean;
  preserveSentenceStructure: boolean;
  preserveCitation: boolean;
  optionsCount: number;
  lockedSentences: number[];
  lockedTerms: string[];
}

export async function generateRevision(prisma: PrismaClient, input: RewriteInput) {
  const source = await prisma.sourceDocument.findUnique({ where: { id: input.sourceDocumentId } });
  if (!source) {
    throw new Error("Source document not found");
  }

  const candidates = await provider.generate(
    source.content,
    {
      goal: input.goal,
      readingLevel: input.readingLevel,
      tone: input.tone,
      formality: input.formality,
      aggressiveness: input.aggressiveness,
      preserveSentenceStructure: input.preserveSentenceStructure,
      preserveTerminology: input.preserveTerminology,
      lockedTerms: input.lockedTerms
    },
    input.optionsCount
  );

  const revisions = [];

  for (let optionIndex = 0; optionIndex < candidates.length; optionIndex += 1) {
    const candidate = candidates[optionIndex];
    const semantic = analyzeSemanticFidelity(source.content, candidate.rewrittenText);

    const revision = await prisma.revision.create({
      data: {
        projectId: input.projectId,
        sourceDocumentId: source.id,
        userId: input.userId,
        voiceProfileId: input.voiceProfileId,
        goal: input.goal,
        readingLevel: input.readingLevel,
        tone: input.tone,
        formality: input.formality,
        aggressiveness: input.aggressiveness,
        preserveTerminology: input.preserveTerminology,
        preserveSentenceStructure: input.preserveSentenceStructure,
        preserveCitation: input.preserveCitation,
        lockedSentences: input.lockedSentences,
        lockedTerms: input.lockedTerms,
        rewrittenText: candidate.rewrittenText,
        optionIndex: optionIndex + 1,
        semanticScore: semantic.semanticScore,
        driftWarnings: semantic.warnings as unknown as Prisma.InputJsonValue,
        status: "GENERATED",
        sentenceDiffs: {
          create: semantic.analyses.map((analysis) => ({
            sentenceIndex: analysis.sentenceIndex,
            originalSentence: analysis.originalSentence,
            revisedSentence: analysis.revisedSentence,
            rationale: candidate.rationale,
            semanticScore: analysis.semanticScore,
            claimStrengthWarning: analysis.claimStrengthWarning,
            namedEntityWarning: analysis.namedEntityWarning,
            numberOrDateWarning: analysis.numberOrDateWarning,
            citationWarning: analysis.citationWarning
          }))
        }
      },
      include: {
        sentenceDiffs: true
      }
    });

    revisions.push(revision);
  }

  return revisions;
}
