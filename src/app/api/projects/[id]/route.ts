import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/utils/response";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: user.id
    },
    include: {
      sourceDocuments: { orderBy: { createdAt: "asc" } },
      revisions: {
        include: { sentenceDiffs: { orderBy: { sentenceIndex: "asc" } } },
        orderBy: { createdAt: "desc" }
      },
      transparencyReports: { orderBy: { createdAt: "desc" } },
      exportJobs: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });

  if (!project) {
    return jsonError("Project not found", 404);
  }

  return Response.json({ project });
}
