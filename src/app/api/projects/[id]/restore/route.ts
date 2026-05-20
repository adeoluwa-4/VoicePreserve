import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/utils/response";
import { Prisma } from "@prisma/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;
  const body = (await request.json()) as { revisionId?: string };

  if (!body.revisionId) {
    return jsonError("revisionId is required", 400);
  }

  const revision = await prisma.revision.findFirst({
    where: { id: body.revisionId, projectId, userId: user.id }
  });

  if (!revision) {
    return jsonError("Revision not found", 404);
  }

  const restored = await prisma.revision.create({
    data: {
      projectId,
      userId: user.id,
      sourceDocumentId: revision.sourceDocumentId,
      voiceProfileId: revision.voiceProfileId,
      parentRevisionId: revision.id,
      goal: revision.goal,
      readingLevel: revision.readingLevel,
      tone: revision.tone,
      formality: revision.formality,
      aggressiveness: revision.aggressiveness,
      preserveTerminology: revision.preserveTerminology,
      preserveSentenceStructure: revision.preserveSentenceStructure,
      preserveCitation: revision.preserveCitation,
      lockedSentences: revision.lockedSentences,
      lockedTerms: revision.lockedTerms,
      rewrittenText: revision.rewrittenText,
      optionIndex: revision.optionIndex,
      semanticScore: revision.semanticScore,
      driftWarnings: revision.driftWarnings as Prisma.InputJsonValue,
      status: "FINALIZED"
    }
  });

  return Response.json({ restored }, { status: 201 });
}
