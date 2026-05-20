import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildTransparencyReport } from "@/lib/services/transparency";
import { jsonError } from "@/lib/utils/response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;
  const body = (await request.json()) as { revisionId?: string; notes?: string };

  if (!body.revisionId) {
    return jsonError("revisionId is required", 400);
  }

  const revision = await prisma.revision.findFirst({
    where: { id: body.revisionId, projectId, userId: user.id },
    include: { sentenceDiffs: true }
  });

  if (!revision) {
    return jsonError("Revision not found", 404);
  }

  const reportJson = buildTransparencyReport({
    draftCreatedAt: revision.createdAt,
    rewriteRequestedAt: revision.updatedAt,
    sentenceDiffs: revision.sentenceDiffs,
    usedWritingSamples: Boolean(revision.voiceProfileId)
  });

  const report = await prisma.transparencyReport.create({
    data: {
      userId: user.id,
      projectId,
      revisionId: revision.id,
      draftCreatedAt: revision.createdAt,
      rewriteRequestedAt: revision.updatedAt,
      editCount: revision.sentenceDiffs.length,
      heavilyChangedSections: reportJson.heavilyChangedSections,
      usedWritingSamples: Boolean(revision.voiceProfileId),
      notes: body.notes,
      reportJson
    }
  });

  return Response.json({ report }, { status: 201 });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;

  const reports = await prisma.transparencyReport.findMany({
    where: { projectId, userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return Response.json({ reports });
}
