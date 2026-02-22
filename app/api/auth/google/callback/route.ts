import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName } from "@/lib/auth";
import { countUsers, createUser, findUserByEmail } from "@/lib/users";
import { readAppSettings } from "@/lib/settings";

const oauthStateCookieName = "google_oauth_state";
const oneWeekSeconds = 60 * 60 * 24 * 7;

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  name?: string;
  email_verified?: boolean;
};

function getGoogleCredentials() {
  // Read and validate Google OAuth credentials from environment variables.
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials.");
  }
  return { clientId, clientSecret };
}

function resolveAppOrigin(request: Request) {
  // Use explicit app URL when provided, otherwise infer from callback URL.
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envOrigin) {
    return envOrigin.replace(/\/+$/, "");
  }
  return new URL(request.url).origin;
}

async function exchangeCodeForAccessToken(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  // Exchange Google authorization code for access token.
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) {
    return null;
  }
  const tokenBody = (await tokenResponse.json()) as GoogleTokenResponse;
  return tokenBody.access_token ?? null;
}

async function loadGoogleUserInfo(accessToken: string) {
  // Load authenticated Google user's profile and email.
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!profileResponse.ok) {
    return null;
  }
  return (await profileResponse.json()) as GoogleUserInfoResponse;
}

export async function GET(request: Request) {
  // Complete Google OAuth flow, auto-create user if needed, and set app session cookie.
  const appOrigin = resolveAppOrigin(request);
  const loginUrl = new URL("/login", appOrigin);
  const homeUrl = new URL("/", appOrigin);
  const stateFromCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${oauthStateCookieName}=`))
    ?.split("=")[1] ?? "";

  function redirectToLoginWithError(errorCode: string) {
    // Include error code in login URL so the UI can show a useful message.
    const url = new URL(loginUrl);
    url.searchParams.set("google_error", errorCode);
    const response = NextResponse.redirect(url, { status: 302 });
    response.cookies.set({
      name: oauthStateCookieName,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim() ?? "";
    const state = searchParams.get("state")?.trim() ?? "";
    if (!code || !state || !stateFromCookie || state !== stateFromCookie) {
      return redirectToLoginWithError("state_mismatch");
    }

    const { clientId, clientSecret } = getGoogleCredentials();
    const redirectUri = `${appOrigin}/api/auth/google/callback`;
    const accessToken = await exchangeCodeForAccessToken({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });
    if (!accessToken) {
      return redirectToLoginWithError("token_exchange_failed");
    }

    const userInfo = await loadGoogleUserInfo(accessToken);
    const email = userInfo?.email?.trim().toLowerCase() ?? "";
    if (!email || userInfo?.email_verified === false) {
      return redirectToLoginWithError("email_not_verified");
    }

    let user = await findUserByEmail(email);
    if (!user) {
      const settings = await readAppSettings();
      const totalUsers = await countUsers();
      if (totalUsers >= settings.maxRegisteredUsers) {
        return redirectToLoginWithError("max_users_reached");
      }

      user = await createUser({
        email,
        name: userInfo?.name?.trim() || email.split("@")[0],
        // Create an internal password so OAuth users can still fit current schema.
        password: randomBytes(24).toString("hex"),
      });
    }

    const response = NextResponse.redirect(homeUrl, { status: 302 });
    response.cookies.set({
      name: sessionCookieName,
      value: createSessionToken(user.email),
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: oneWeekSeconds,
    });
    response.cookies.set({
      name: oauthStateCookieName,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return redirectToLoginWithError("callback_failed");
  }
}
