import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { jsonError } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireSessionUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id, archivedAt: null },
    include: {
      revisions: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" }
  });

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  const limiter = checkRateLimit(`project:create:${user.id}`);
  if (!limiter.allowed) {
    return jsonError(`Too many requests. Retry in ${limiter.retryAfter}s`, 429);
  }

  const body = (await request.json()) as { title?: string; description?: string; initialText?: string };
  if (!body.title?.trim()) {
    return jsonError("Project title is required", 400);
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: body.title.trim(),
      description: body.description?.trim()
    }
  });

  if (body.initialText?.trim()) {
    await prisma.sourceDocument.create({
      data: {
        projectId: project.id,
        sourceType: "PASTED",
        content: body.initialText.trim()
      }
    });
  }

  return Response.json({ project }, { status: 201 });
}
