import bcrypt from "bcryptjs";
import { PrismaClient, RevisionGoal, RevisionStatus, SourceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD before running the seed command.");
  }
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      displayName: "Demo User"
    }
  });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: "Launch memo revision",
      description: "Demo project for VoicePreserve"
    }
  });

  const sourceDocument = await prisma.sourceDocument.create({
    data: {
      projectId: project.id,
      sourceType: SourceType.PASTED,
      content:
        "Our new process is expected to improve throughput by 30 percent over Q4. We should announce this next Monday after legal review."
    }
  });

  await prisma.revision.create({
    data: {
      projectId: project.id,
      userId: user.id,
      sourceDocumentId: sourceDocument.id,
      goal: RevisionGoal.PROFESSIONAL,
      readingLevel: "grade10",
      tone: "confident",
      formality: 4,
      aggressiveness: 2,
      preserveTerminology: true,
      preserveSentenceStructure: false,
      rewrittenText:
        "Our updated process is expected to raise throughput by 30 percent in Q4. We plan to share this update next Monday following legal review.",
      semanticScore: 0.93,
      driftWarnings: [],
      status: RevisionStatus.GENERATED
    }
  });

  console.log(`Seeded demo user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
