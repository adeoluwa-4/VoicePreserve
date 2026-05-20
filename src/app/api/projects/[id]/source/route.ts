import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/utils/response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id: projectId } = await params;
  const body = (await request.json()) as { content?: string };

  if (!body.content?.trim()) {
    return jsonError("content is required", 400);
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) {
    return jsonError("Project not found", 404);
  }

  const document = await prisma.sourceDocument.create({
    data: {
      projectId,
      sourceType: "PASTED",
      content: body.content.trim()
    }
  });

  return Response.json({ document }, { status: 201 });
}
