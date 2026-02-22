import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, verifySessionToken } from "@/lib/auth";
import { AuthForm } from "./auth-form";

function mapGoogleError(code: string | undefined) {
  // Convert OAuth error codes into user-readable login messages.
  switch (code) {
    case "state_mismatch":
      return "Google login expired or was blocked. Please try again.";
    case "token_exchange_failed":
      return "Google login configuration is invalid. Check client ID/secret and callback URL.";
    case "email_not_verified":
      return "Your Google email is not verified.";
    case "max_users_reached":
      return "Registration limit reached. Contact admin.";
    case "callback_failed":
      return "Google login failed. Please try again.";
    case "start_failed":
      return "Google login could not start. Check server env variables and OAuth setup.";
    default:
      return "";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string }>;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;
  const params = await searchParams;

  if (session && verifySessionToken(session)) {
    redirect("/");
  }

  const googleError = mapGoogleError(params.google_error);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <AuthForm initialError={googleError} />
    </main>
  );
}
