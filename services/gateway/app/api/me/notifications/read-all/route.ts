import { auth } from "@/lib/auth";
import { NotifAPI } from "@/lib/api";

/**
 * PATCH /api/me/notifications/read-all — marque toutes les notifications
 * de l'utilisateur authentifié comme lues.
 */
export async function PATCH() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!userId || !token) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const data = await NotifAPI.markAllRead(userId, token);
    return Response.json(data);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
