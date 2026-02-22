import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName } from "@/lib/auth";
import { countUsers, createUser, findUserByEmail, updateUserAvatar } from "@/lib/users";
import { readAppSettings } from "@/lib/settings";

const oauthStateCookieName = "google_oauth_state";
const oneWeekSeconds = 60 * 60 * 24 * 7;

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  name?: string;
  picture?: string;
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

function resolveGoogleRedirectUri(request: Request) {
  // Keep token exchange redirect URI identical to OAuth start redirect URI.
  const explicitRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicitRedirectUri) {
    return explicitRedirectUri;
  }
  return `${resolveAppOrigin(request)}/api/auth/google/callback`;
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
  const cookieStore = await cookies();
  const stateFromCookie = cookieStore.get(oauthStateCookieName)?.value ?? "";

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
    const redirectUri = resolveGoogleRedirectUri(request);
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
    const avatarUrl = userInfo?.picture?.trim() ?? "";
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
        avatarUrl: avatarUrl || null,
        // Create an internal password so OAuth users can still fit current schema.
        password: randomBytes(24).toString("hex"),
      });
    } else if (!user.avatarUrl && avatarUrl) {
      // Backfill avatar from Google for existing accounts missing one.
      const updated = await updateUserAvatar(user.email, avatarUrl);
      if (updated) {
        user = updated;
      }
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
