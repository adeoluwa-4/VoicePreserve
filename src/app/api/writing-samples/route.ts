import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { parseUpload } from "@/lib/files/parser";
import { storageAdapter } from "@/lib/files/storage";
import { jsonError } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireSessionUser();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("No writing sample uploaded", 400);
  }

  const sampleCount = await prisma.writingSample.count({ where: { userId: user.id } });
  if (sampleCount >= 10) {
    return jsonError("Maximum 10 writing samples allowed", 400);
  }

  try {
    const parsed = await parseUpload(file);
    const stored = await storageAdapter.put(parsed.filename, parsed.mimeType, parsed.bytes);

    const sample = await prisma.writingSample.create({
      data: {
        userId: user.id,
        title: parsed.filename,
        sourceType: parsed.sourceType,
        originalFilename: parsed.filename,
        storageKey: stored.key,
        content: parsed.content
      }
    });

    return Response.json({ sample }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Writing sample upload failed", 400);
  }
}

export async function GET() {
  const user = await requireSessionUser();
  const samples = await prisma.writingSample.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ samples });
}
