import { ExportType, Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/db/prisma";
import { storageAdapter } from "@/lib/files/storage";
import { getExportQueue } from "@/lib/queue/export-queue";

export async function enqueueExportJob(input: {
  userId: string;
  projectId: string;
  revisionId?: string;
  reportId?: string;
  exportType: ExportType;
}) {
  const job = await prisma.exportJob.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      revisionId: input.revisionId,
      reportId: input.reportId,
      exportType: input.exportType,
      status: "PENDING"
    }
  });

  const queue = getExportQueue();
  if (queue) {
    await queue.add("build-export", { exportJobId: job.id });
  }

  return job;
}

export async function completeExportJob(
  exportJobId: string,
  content: Buffer,
  filename: string,
  mimeType: string
) {
  const stored = await storageAdapter.put(filename, mimeType, content);
  const signedUrl = await storageAdapter.getSignedUrl(stored.key, Number(process.env.SIGNED_URL_TTL_SECONDS ?? 900));

  return prisma.exportJob.update({
    where: { id: exportJobId },
    data: {
      status: "COMPLETE",
      storageKey: stored.key,
      signedUrl,
      expiresAt: new Date(Date.now() + 900_000)
    }
  });
}

export async function failExportJob(exportJobId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown export error";
  return prisma.exportJob.update({
    where: { id: exportJobId },
    data: {
      status: "FAILED",
      errorMessage: message
    }
  });
}

export async function buildExportContent(
  job: Prisma.ExportJobGetPayload<{}>
): Promise<{ filename: string; content: Buffer; mimeType: string }> {
  let filename = "";
  let content: Buffer = Buffer.from("");
  let mimeType = "text/plain";

  if (job.exportType === ExportType.FINAL_TEXT || job.exportType === ExportType.TRACKED_DIFF || job.exportType === ExportType.REVISION_SUMMARY) {
    if (!job.revisionId) {
      throw new Error("Revision id missing for revision-based export");
    }

    const revision = await prisma.revision.findUnique({
      where: { id: job.revisionId },
      include: { sentenceDiffs: true, sourceDocument: true }
    });

    if (!revision) {
      throw new Error("Revision not found");
    }

    if (job.exportType === ExportType.FINAL_TEXT) {
      filename = `final-${revision.id}.txt`;
      content = Buffer.from(revision.rewrittenText, "utf8");
      return { filename, content, mimeType };
    }

    if (job.exportType === ExportType.TRACKED_DIFF) {
      const lines = revision.sentenceDiffs
        .map((diff) =>
          [
            `Sentence ${diff.sentenceIndex + 1}`,
            `- Original: ${diff.originalSentence}`,
            `+ Revised: ${diff.revisedSentence}`,
            `Decision: ${diff.decision}`,
            ""
          ].join("\n")
        )
        .join("\n");
      filename = `diff-${revision.id}.txt`;
      content = Buffer.from(lines, "utf8");
      return { filename, content, mimeType };
    }

    const summary = [
      `Revision ID: ${revision.id}`,
      `Goal: ${revision.goal}`,
      `Semantic score: ${revision.semanticScore.toFixed(2)}`,
      `Warnings: ${JSON.stringify(revision.driftWarnings)}`,
      `Sentence edits: ${revision.sentenceDiffs.length}`
    ].join("\n");

    filename = `summary-${revision.id}.txt`;
    content = Buffer.from(summary, "utf8");
    return { filename, content, mimeType };
  }

  if (!job.reportId) {
    throw new Error("Report id missing for transparency export");
  }

  const report = await prisma.transparencyReport.findUnique({ where: { id: job.reportId } });
  if (!report) {
    throw new Error("Transparency report not found");
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const text = JSON.stringify(report.reportJson, null, 2);
  const lines = text.split("\n");

  let y = 760;
  for (const line of lines.slice(0, 80)) {
    page.drawText(line.slice(0, 100), { x: 40, y, size: 10, font });
    y -= 14;
    if (y < 40) {
      break;
    }
  }

  filename = `transparency-${report.id}.pdf`;
  content = Buffer.from(await pdf.save());
  mimeType = "application/pdf";

  return { filename, content, mimeType };
}
