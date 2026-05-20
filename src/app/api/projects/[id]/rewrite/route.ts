import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { generateRevision } from "@/lib/services/rewrite";
import { jsonError } from "@/lib/utils/response";
import { rewriteRequestSchema } from "@/lib/validation/rewrite";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const user = await requireSessionUser();
  const { id } = await params;

  const parsed = rewriteRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid rewrite payload", 400);
  }

  if (parsed.data.projectId !== id) {
    return jsonError("Project id mismatch", 400);
  }

  const project = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!project) {
    return jsonError("Project not found", 404);
  }

  const revisions = await generateRevision(prisma, {
    ...parsed.data,
    userId: user.id
  });

  return Response.json({ revisions }, { status: 201 });
}
