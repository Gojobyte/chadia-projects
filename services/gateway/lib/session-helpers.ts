// ============================================================
// Helpers de session NextAuth.
// Centralise les casts unsafe sur Session pour éviter de répéter
// `(session as { authServiceToken?: string }).authServiceToken`
// dans chaque Server Action et Server Component.
// ============================================================

import type { Session } from "next-auth";

/** Le token JWT brut du service auth, attaché à la session NextAuth par le
 *  callback jwt() dans lib/auth.ts. Retourne null si pas de session ou
 *  pas de token (l'utilisateur n'est pas authentifié).
 *  Utilisé pour les appels machine-to-machine vers tender-service. */
export function getAuthToken(session: Session | null | undefined): string | null {
  if (!session) return null;
  const t = (session as { authServiceToken?: string }).authServiceToken;
  return t ?? null;
}

/** Le token Google OAuth (pour Drive, Docs, Sheets). Sera utilisé quand on
 *  brancera l'édition Google Docs en V2. */
export function getGoogleAccessToken(session: Session | null | undefined): string | null {
  if (!session) return null;
  const t = (session as { googleAccessToken?: string }).googleAccessToken;
  return t ?? null;
}

/** L'ID stable de l'utilisateur courant (depuis le callback session() de
 *  next-auth). */
export function getUserId(session: Session | null | undefined): string | null {
  if (!session?.user) return null;
  const id = (session.user as { id?: string }).id;
  return id ?? null;
}
