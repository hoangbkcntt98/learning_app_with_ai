import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const oauthStateCookieName = "google_oauth_state";

function getGoogleClientId() {
  // Read Google OAuth client ID required for the auth redirect URL.
  const value = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!value) {
    throw new Error("Missing GOOGLE_CLIENT_ID.");
  }
  return value;
}

function resolveAppOrigin(request: Request) {
  // Prefer forwarded host/proto on Vercel, then fallback to explicit env URL.
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim() || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envOrigin) {
    return envOrigin.replace(/\/+$/, "");
  }
  // Final fallback is current request origin.
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  // Start Google OAuth flow and include CSRF state token in cookie + query.
  const loginUrl = new URL("/login", resolveAppOrigin(request));

  function redirectToLoginWithError(errorCode: string) {
    // Include explicit start-stage error for easier production debugging.
    const url = new URL(loginUrl);
    url.searchParams.set("google_error", errorCode);
    return NextResponse.redirect(url, { status: 302 });
  }

  try {
    const clientId = getGoogleClientId();
    const origin = resolveAppOrigin(request);
    const state = randomBytes(24).toString("hex");
    const redirectUri = `${origin}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    const response = NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
    response.cookies.set({
      name: oauthStateCookieName,
      value: state,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
    });
    return response;
  } catch {
    return redirectToLoginWithError("start_failed");
  }
}
