import { auth } from "@/lib/auth";
import { unauthorized, forbidden } from "@/lib/utils/api-response";

type UserRole = "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";

const ROLE_LEVEL: Record<UserRole, number> = { DIRECTEUR: 4, ADMIN: 3, FINANCIER: 2, MEMBRE: 1 };

export async function requireRole(minimumRole: UserRole) {
  const session = await auth();
  if (!session?.user) return { error: unauthorized(), user: null };
  if (ROLE_LEVEL[session.user.role] < ROLE_LEVEL[minimumRole]) return { error: forbidden(), user: null };
  return { error: null, user: session.user };
}

// Helper to extract the service-auth JWT from the session for forwarding to microservices
export async function getAuthToken(): Promise<string | null> {
  const session = await auth();
  return (session as { authServiceToken?: string } | null)?.authServiceToken ?? null;
}
