import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedMatchers = {
  upload: [
    /^\/upload(?:\/.*)?$/,
    /^\/api\/uploads(?:\/.*)?$/,
  ],
  manage: [
    /^\/manage(?:\/.*)?$/,
    /^\/api\/manage(?:\/.*)?$/,
  ],
};

function matchesAny(pathname: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(pathname));
}

function decodePassword(header: string | null) {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(header.slice(6));
    const [, password = ""] = decoded.split(":");
    return password;
  } catch {
    return null;
  }
}

function challenge(realm: string) {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authHeader = request.headers.get("authorization");

  const uploadPassword = process.env.UPLOAD_ACCESS_PASSWORD;
  const managePassword = process.env.MANAGE_ACCESS_PASSWORD;
  const requestPassword = decodePassword(authHeader);

  const isManageCategoryWrite =
    pathname.startsWith("/api/categories") && request.method !== "GET";

  if (
    uploadPassword &&
    matchesAny(pathname, protectedMatchers.upload) &&
    requestPassword !== uploadPassword
  ) {
    return challenge("Upload");
  }

  if (
    managePassword &&
    (matchesAny(pathname, protectedMatchers.manage) || isManageCategoryWrite) &&
    requestPassword !== managePassword
  ) {
    return challenge("Manage");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/upload/:path*", "/manage/:path*", "/api/:path*"],
};
