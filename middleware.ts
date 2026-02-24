import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const checkUrl = new URL("/api/feature-access/check", request.url);
  checkUrl.searchParams.set("path", pathname);

  try {
    const response = await fetch(checkUrl, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!response.ok) {
      return NextResponse.next();
    }

    const body = (await response.json()) as { allowed?: boolean; message?: string };
    if (body.allowed !== false) {
      return NextResponse.next();
    }

    const restrictedUrl = new URL("/feature-restricted", request.url);
    if (body.message) {
      restrictedUrl.searchParams.set("message", body.message);
    }
    return NextResponse.redirect(restrictedUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/play/:path*",
    "/ai-chat/:path*",
    "/forum/:path*",
    "/review/:path*",
    "/store/:path*",
    "/admin/:path*",
  ],
};

