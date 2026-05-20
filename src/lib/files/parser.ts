import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export interface ParsedUpload {
  sourceType: "TXT" | "PDF" | "DOCX";
  content: string;
  mimeType: string;
  filename: string;
  bytes: Buffer;
}

export async function parseUpload(file: File): Promise<ParsedUpload> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const lower = filename.toLowerCase();

  if (bytes.byteLength > 100 * 1024 * 1024) {
    throw new Error("File exceeds 100MB GitHub-safe artifact limit.");
  }

  if (lower.endsWith(".txt")) {
    return {
      sourceType: "TXT",
      content: bytes.toString("utf8"),
      filename,
      mimeType: file.type || "text/plain",
      bytes
    };
  }

  if (lower.endsWith(".docx")) {
    const extracted = await mammoth.extractRawText({ buffer: bytes });
    return {
      sourceType: "DOCX",
      content: extracted.value,
      filename,
      mimeType: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes
    };
  }

  if (lower.endsWith(".pdf")) {
    const extracted = await pdfParse(bytes);
    return {
      sourceType: "PDF",
      content: extracted.text,
      filename,
      mimeType: file.type || "application/pdf",
      bytes
    };
  }

  throw new Error("Unsupported file type. Please upload .txt, .docx, or .pdf.");
}
