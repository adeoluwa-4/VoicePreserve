import { ExportType } from "@prisma/client";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { enqueueExportJob } from "@/lib/services/export";
import { jsonError } from "@/lib/utils/response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;
  const body = (await request.json()) as {
    exportType?: ExportType;
    revisionId?: string;
    reportId?: string;
  };

  if (!body.exportType) {
    return jsonError("exportType is required", 400);
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) {
    return jsonError("Project not found", 404);
  }

  const job = await enqueueExportJob({
    userId: user.id,
    projectId,
    exportType: body.exportType,
    revisionId: body.revisionId,
    reportId: body.reportId
  });

  return Response.json({ job }, { status: 202 });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;

  const jobs = await prisma.exportJob.findMany({
    where: { projectId, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return Response.json({ jobs });
}
