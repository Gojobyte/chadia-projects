import { auth } from "@/lib/auth";
import { NotifAPI } from "@/lib/api";

/**
 * PATCH /api/me/notifications/:id/read — marque une notification comme lue.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!token) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  try {
    const data = await NotifAPI.markRead(id, token);
    return Response.json(data);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
