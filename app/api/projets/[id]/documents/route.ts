import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error } from "@/lib/utils/api-response";

// PUT /api/projets/:id/documents — Mettre a jour le statut d'un document
export async function PUT(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const body = await request.json();
  const { documentId, statut, assigneAId } = body;

  if (!documentId) return error("documentId requis", 400);

  const updateData: Record<string, unknown> = {};
  if (statut) updateData.statut = statut;
  if (assigneAId !== undefined) updateData.assigneAId = assigneAId || null;

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: updateData,
  });

  return success({ document: doc });
}
