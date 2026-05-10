import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";

// PUT /api/projets/:id/taches/:tacheId — Modifier une tache
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; tacheId: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { tacheId } = await params;

  const existing = await prisma.tache.findUnique({ where: { id: tacheId } });
  if (!existing) return notFound("Tache");

  const body = await request.json();
  const { titre, description, assigneAId, statut, priorite, dateLimite } = body;

  const updateData: Record<string, unknown> = {};
  if (titre !== undefined) updateData.titre = titre;
  if (description !== undefined) updateData.description = description;
  if (assigneAId !== undefined) updateData.assigneAId = assigneAId || null;
  if (statut !== undefined) updateData.statut = statut;
  if (priorite !== undefined) updateData.priorite = priorite;
  if (dateLimite !== undefined) updateData.dateLimite = dateLimite ? new Date(dateLimite) : null;

  const tache = await prisma.tache.update({
    where: { id: tacheId },
    data: updateData,
    include: { assigneA: { select: { id: true, name: true } } },
  });

  // Notifier si reassigne
  if (assigneAId && assigneAId !== existing.assigneAId) {
    await prisma.notification.create({
      data: {
        userId: assigneAId,
        titre: "Tache assignee",
        message: `La tache "${tache.titre}" vous a ete assignee`,
        lien: `/projets/${existing.projetId}`,
      },
    });
  }

  return success({ tache });
}

// DELETE /api/projets/:id/taches/:tacheId
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tacheId: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { tacheId } = await params;

  const existing = await prisma.tache.findUnique({ where: { id: tacheId } });
  if (!existing) return notFound("Tache");

  await prisma.tache.delete({ where: { id: tacheId } });
  return success({ message: "Tache supprimee." });
}
