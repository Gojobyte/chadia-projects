import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error } from "@/lib/utils/api-response";

// POST /api/projets/:id/documents — Créer un nouveau document
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const body = await request.json();
  const { titre, categorie, description } = body;

  if (!titre) return error("Le titre est requis", 400);

  // Compter les documents existants pour l'ordre
  const count = await prisma.document.count({ where: { projetId: id } });

  const doc = await prisma.document.create({
    data: {
      projetId: id,
      titre,
      categorie: categorie ?? "AUTRE",
      description: description ?? null,
      ordre: count,
    },
  });

  return success({ document: doc });
}

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
