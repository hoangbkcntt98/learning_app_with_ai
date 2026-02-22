import { cookies } from "next/headers";
import { sessionCookieName, verifySessionToken } from "./auth";
import { findUserByEmail } from "./users";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(sessionCookieName)?.value;

  if (!session) {
    return null;
  }

  const payload = verifySessionToken(session);
  if (!payload) {
    return null;
  }

  return findUserByEmail(payload.email);
}

export async function getCurrentAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}
