import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Get the current session and require authentication.
 * Use in Server Components and API routes.
 * Redirects to /login if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

/**
 * Get the current session without requiring authentication.
 * Returns null if not authenticated.
 */
export async function getSession() {
  return await auth();
}

/**
 * Check if the current user has a specific role.
 * Redirects to /login if not authenticated.
 * Returns false if authenticated but doesn't have the required role.
 */
export async function requireRole(role: "STUDENT" | "INSTRUCTOR" | "ADMIN") {
  const session = await requireAuth();

  if (session.user.role !== role && session.user.role !== "ADMIN") {
    return false;
  }

  return true;
}

/**
 * Check if the current user is an admin.
 * Redirects to /login if not authenticated.
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}

/**
 * Check if the current user is an instructor or admin.
 * Redirects to /login if not authenticated.
 */
export async function requireInstructor() {
  const session = await requireAuth();

  if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}
