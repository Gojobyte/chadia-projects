import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, created, error } from "@/lib/utils/api-response";

// GET /api/projets/:id/taches
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const taches = await prisma.tache.findMany({
    where: { projetId: id },
    include: {
      assigneA: { select: { id: true, name: true } },
      document: { select: { id: true, titre: true } },
    },
    orderBy: [{ priorite: "asc" }, { createdAt: "desc" }],
  });

  return success({ taches });
}

// POST /api/projets/:id/taches
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const body = await request.json();
  const { titre, description, assigneAId, documentId, dateLimite, priorite } = body;

  if (!titre) return error("Le titre est requis.", 400);

  const tache = await prisma.tache.create({
    data: {
      projetId: id,
      titre,
      description: description ?? null,
      assigneAId: assigneAId ?? null,
      documentId: documentId ?? null,
      dateLimite: dateLimite ? new Date(dateLimite) : null,
      priorite: priorite ?? "MOYENNE",
    },
    include: { assigneA: { select: { id: true, name: true } } },
  });

  // Notifier la personne assignee
  if (assigneAId) {
    await prisma.notification.create({
      data: {
        userId: assigneAId,
        titre: "Nouvelle tache assignee",
        message: `Vous avez ete assigne a la tache "${titre}"`,
        lien: `/projets/${id}`,
      },
    });
  }

  await prisma.activite.create({
    data: { projetId: id, userId: result.user.id, action: "CREATION_TACHE", description: `Tache "${titre}" creee` },
  });

  return created({ tache });
}
