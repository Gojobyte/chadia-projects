import { auth } from "@/lib/auth";
import { NotifAPI } from "@/lib/api";
import type { NextRequest } from "next/server";

/**
 * GET /api/me/notifications — récupère les notifications de l'utilisateur
 * authentifié. Bridge : extrait userId depuis la session NextAuth puis
 * appelle le service notification.
 *
 * Query params : lu (true/false), limit, page.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!userId || !token) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sp = req.nextUrl.searchParams;
  const params: Record<string, string> = { userId };
  if (sp.get("lu")) params.lu = sp.get("lu")!;
  if (sp.get("limit")) params.limit = sp.get("limit")!;
  if (sp.get("page")) params.page = sp.get("page")!;

  try {
    const data = await NotifAPI.listNotifications(userId, token);
    return Response.json(data);
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
