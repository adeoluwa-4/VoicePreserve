import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { extractVoiceFeatures } from "@/lib/services/voice-profile";
import { jsonError } from "@/lib/utils/response";

export async function GET() {
  const user = await requireSessionUser();
  const profiles = await prisma.voiceProfile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return Response.json({ profiles });
}

export async function POST(request: Request) {
  const user = await requireSessionUser();
  const body = (await request.json()) as { name?: string; sampleIds?: string[] };

  const sampleIds = body.sampleIds ?? [];
  if (sampleIds.length < 2 || sampleIds.length > 10) {
    return jsonError("Select between 2 and 10 writing samples.", 400);
  }

  const samples = await prisma.writingSample.findMany({
    where: { id: { in: sampleIds }, userId: user.id }
  });

  if (samples.length !== sampleIds.length) {
    return jsonError("One or more writing samples were not found.", 404);
  }

  const features = extractVoiceFeatures(samples.map((sample) => sample.content));

  const profile = await prisma.voiceProfile.create({
    data: {
      userId: user.id,
      name: body.name?.trim() || `Voice profile ${new Date().toLocaleDateString()}`,
      avgSentenceLength: features.avgSentenceLength,
      preferredTransitions: features.preferredTransitions,
      toneMarkers: features.toneMarkers,
      punctuationHabits: features.punctuationHabits,
      lexicalFeatures: features.lexicalFeatures,
      sampleCount: samples.length
    }
  });

  return Response.json({ profile }, { status: 201 });
}
