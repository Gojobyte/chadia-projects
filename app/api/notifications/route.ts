import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/utils/api-response";
import { markAsRead } from "@/lib/notifications";

// GET /api/notifications — Mes notifications
export async function GET() {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const nonLues = await prisma.notification.count({
    where: { userId: session.user.id, lu: false },
  });

  return success({ notifications, nonLues });
}

// PUT /api/notifications — Marquer toutes comme lues
export async function PUT() {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);

  await prisma.notification.updateMany({
    where: { userId: session.user.id, lu: false },
    data: { lu: true },
  });

  return success({ message: "Notifications marquees comme lues." });
}

// PATCH /api/notifications — Marquer une notification comme lue
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return error("Corps de requête JSON invalide.", 400);
  }
  if (!body.id) return error("`id` requis.", 400);

  const notif = await prisma.notification.findUnique({ where: { id: body.id } });
  if (!notif || notif.userId !== session.user.id) return error("Notification introuvable.", 404);

  const updated = await markAsRead(body.id);
  return success({ notification: updated });
}
