import path from "node:path";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

function sanitizeFileNamePart(value: string) {
  return (
    value
      .normalize("NFC")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "memory"
  );
}

export function getMemoryFileExtension(memory: Pick<MemoryRecord, "imageKey">) {
  return path.extname(memory.imageKey) || ".jpg";
}

export function getMemoryDownloadFileName(memory: MemoryRecord) {
  const date = new Date(memory.createdAt).toISOString().slice(0, 10);
  const extension = getMemoryFileExtension(memory);

  return `${sanitizeFileNamePart(getPublicMemoryDisplayName(memory))}-${date}${extension}`;
}

export function getMemoryZipEntryName(memory: MemoryRecord) {
  const date = new Date(memory.createdAt).toISOString().slice(0, 10);
  const extension = getMemoryFileExtension(memory);
  const shortId = memory.id.slice(0, 8);

  return `${date}-${sanitizeFileNamePart(getPublicMemoryDisplayName(memory))}-${shortId}${extension}`;
}

export function getAttachmentContentDisposition(fileName: string) {
  const asciiFallback =
    fileName
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/["\\]/g, "")
      .trim() || "download";

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
