import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";

// GET /api/documents/:id — Detail d'un document
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      projet: { select: { id: true, titre: true } },
      assigneA: { select: { id: true, name: true } },
      commentaires: { select: { id: true, contenu: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" as const }, take: 10 },
    },
  });
  if (!doc) return notFound("Document");
  return success({ document: doc });
}

// PUT /api/documents/:id — Sauvegarder le contenu
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return notFound("Document");

  const body = await request.json();
  const { contenu, titre, statut, fichierUrl } = body;

  const updateData: Record<string, unknown> = {};
  if (contenu !== undefined) updateData.contenu = contenu;
  if (titre !== undefined) updateData.titre = titre;
  if (statut !== undefined) updateData.statut = statut;
  if (fichierUrl !== undefined) updateData.fichierUrl = fichierUrl;

  // Si le doc passe de A_FAIRE a EN_COURS automatiquement quand on commence a ecrire
  if (contenu && existing.statut === "BROUILLON") {
    updateData.statut = "REDACTION";
  }

  const doc = await prisma.document.update({ where: { id }, data: updateData });

  // Logger
  if (contenu !== undefined) {
    await prisma.activite.create({
      data: {
        projetId: existing.projetId,
        userId: result.user.id,
        action: "REDACTION",
        description: `Document "${existing.titre}" modifie`,
      },
    });
  }

  return success({ document: doc });
}
