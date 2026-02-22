import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, verifySessionToken } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;

  if (session && verifySessionToken(session)) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <AuthForm />
    </main>
  );
}
