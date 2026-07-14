import path from "node:path";

export function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\uac00-\ud7a3]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "category"
  );
}

export function buildCategoryPath(parentPath: string | null, slug: string) {
  return parentPath ? `${parentPath}/${slug}` : slug;
}

export function getFileStemName(fileName: string) {
  const stem = path.basename(fileName, path.extname(fileName)).normalize("NFC");

  return (
    stem
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "이미지"
  );
}
