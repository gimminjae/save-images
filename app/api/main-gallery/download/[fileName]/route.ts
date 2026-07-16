const MAIN_GALLERY_BASE_URL =
  "https://guri-church-bucket.s3.ap-southeast-2.amazonaws.com/hanmong/hanmong16main/";

function buildDownloadHeaders(
  upstream: Response,
  fileName: string,
) {
  const headers = new Headers();
  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";

  headers.set("Content-Type", contentType);
  headers.set(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const contentLength = upstream.headers.get("content-length");

  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return headers;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await context.params;
  const targetUrl = new URL(fileName, MAIN_GALLERY_BASE_URL).toString();
  const upstream = await fetch(targetUrl, {
    cache: "force-cache",
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      {
        error: "이미지를 다운로드하지 못했어요.",
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: buildDownloadHeaders(upstream, fileName),
    status: 200,
  });
}
