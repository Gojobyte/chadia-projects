import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/utils/api-response";

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
