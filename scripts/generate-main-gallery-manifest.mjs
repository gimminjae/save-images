import path from "node:path";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

async function generateMainGalleryManifest() {
  const workspaceRoot = process.cwd();
  const imagesDirectory = path.join(workspaceRoot, "public", "images");
  const outputFilePath = path.join(
    workspaceRoot,
    "public",
    "main-gallery-manifest.json",
  );
  const directoryEntries = await readdir(imagesDirectory, {
    withFileTypes: true,
  });
  const imageEntries = directoryEntries.filter((entry) => {
    return (
      entry.isFile() &&
      SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    );
  });
  const images = await Promise.all(
    imageEntries.map(async (entry) => {
      const filePath = path.join(imagesDirectory, entry.name);
      const fileStat = await stat(filePath);

      return {
        lastModified: Math.round(fileStat.mtimeMs),
        name: entry.name,
        url: `/images/${encodeURIComponent(entry.name)}`,
      };
    }),
  );

  images.sort((left, right) => right.lastModified - left.lastModified);

  const manifest = {
    generatedAt: new Date().toISOString(),
    images,
  };

  await mkdir(path.dirname(outputFilePath), { recursive: true });
  await writeFile(
    outputFilePath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Generated main gallery manifest with ${images.length} image(s) at ${path.relative(workspaceRoot, outputFilePath)}`,
  );
}

generateMainGalleryManifest().catch((error) => {
  console.error("Failed to generate main gallery manifest", error);
  process.exitCode = 1;
});
