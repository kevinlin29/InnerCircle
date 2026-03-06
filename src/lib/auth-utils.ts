import { headers } from "next/headers";
import { auth } from "./auth";
import { redirect } from "next/navigation";

/** Get session if exists (returns null if not authenticated) */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/** Get session or redirect to login (for Server Components) */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** Get session or throw error (for API routes) */
export async function requireSessionForApi() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
