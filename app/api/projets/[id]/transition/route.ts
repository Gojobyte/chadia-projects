/**
 * POST /api/projets/[id]/transition — Sprint 1
 *
 * Change le statut d'un projet selon le pipeline défini dans lib/workflow.ts.
 * Valide la transition, log une activité, et notifie les membres du projet.
 */

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { error, notFound, success } from "@/lib/utils/api-response";
import { canTransition, WORKFLOW_LABELS } from "@/lib/workflow";
import { createNotification } from "@/lib/notifications";
import type { ProjetStatut } from "@/app/generated/prisma/client";

const STATUTS: ProjetStatut[] = [
  "BROUILLON", "REDACTION", "RELECTURE", "VALIDATION",
  "FINALISATION", "SOUMIS", "ACCEPTE", "REJETE",
  "EN_COURS", "EN_REVISION", "ARCHIVE",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  let body: { to?: string };
  try {
    body = await request.json();
  } catch {
    return error("Corps de requête JSON invalide.", 400);
  }

  const to = body.to as ProjetStatut | undefined;
  if (!to || !STATUTS.includes(to)) {
    return error("Statut cible invalide.", 400);
  }

  const projet = await prisma.projet.findUnique({
    where: { id },
    include: {
      documents: { select: { statut: true } },
      membres: { select: { userId: true } },
    },
  });
  if (!projet) return notFound("Projet");

  const check = canTransition(projet.statut, to, { documents: projet.documents });
  if (!check.ok) {
    return error(check.reason ?? "Transition non autorisée.", 422);
  }

  const updated = await prisma.projet.update({
    where: { id },
    data: { statut: to },
  });

  const fromLabel = WORKFLOW_LABELS[projet.statut];
  const toLabel = WORKFLOW_LABELS[to];

  await prisma.activite.create({
    data: {
      projetId: id,
      userId: result.user.id,
      action: "TRANSITION",
      description: `Statut : ${fromLabel} → ${toLabel}`,
    },
  });

  // Notifier les membres du projet (sauf l'auteur)
  const recipients = new Set<string>(
    projet.membres.map(m => m.userId).filter(uid => uid !== result.user.id),
  );
  if (projet.createdById !== result.user.id) {
    recipients.add(projet.createdById);
  }
  await Promise.all(
    Array.from(recipients).map(userId =>
      createNotification({
        userId,
        projetId: id,
        type: "PROJET_TRANSITION",
        titre: `Projet : ${toLabel}`,
        message: `Le projet « ${projet.titre} » est passé de ${fromLabel} à ${toLabel}.`,
        lien: `/projets/${id}`,
      })
    ),
  );

  return success({ projet: updated });
}
