import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/utils/response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;
  const body = (await request.json()) as {
    revisionId?: string;
    sentenceIndex?: number;
    decision?: "ACCEPTED" | "REJECTED";
  };

  if (!body.revisionId || body.sentenceIndex === undefined || !body.decision) {
    return jsonError("revisionId, sentenceIndex, and decision are required", 400);
  }

  const revision = await prisma.revision.findFirst({
    where: { id: body.revisionId, projectId, userId: user.id }
  });

  if (!revision) {
    return jsonError("Revision not found", 404);
  }

  const diff = await prisma.sentenceDiff.update({
    where: {
      revisionId_sentenceIndex: {
        revisionId: body.revisionId,
        sentenceIndex: body.sentenceIndex
      }
    },
    data: {
      decision: body.decision
    }
  });

  const pending = await prisma.sentenceDiff.count({
    where: {
      revisionId: body.revisionId,
      decision: "PENDING"
    }
  });

  if (pending === 0) {
    await prisma.revision.update({ where: { id: body.revisionId }, data: { status: "REVIEWED" } });
  }

  return Response.json({ diff });
}
