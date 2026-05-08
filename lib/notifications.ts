/**
 * Notifications — helpers pour le modèle Notification.
 *
 * Le modèle Prisma stocke uniquement { userId, titre, message, lien, lu }.
 * Les champs additionnels (projetId, type) sont acceptés pour le typage côté
 * appelant mais ne sont pas persistés tant que la table n'a pas été étendue.
 */

import { prisma } from "@/lib/prisma";

export interface CreateNotificationInput {
  userId: string;
  titre: string;
  message: string;
  lien?: string;
  // Champs optionnels conservés pour compat — non persistés actuellement
  projetId?: string;
  type?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      titre: input.titre,
      message: input.message,
      lien: input.lien ?? null,
    },
  });
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, lu: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { lu: true },
  });
}
