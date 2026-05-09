import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";

// GET /api/appels-offres/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const appelOffre = await prisma.appelOffre.findUnique({
    where: { id },
    include: {
      bailleur: true,
      soumissions: {
        include: {
          fournisseur: { select: { raisonSociale: true, sigle: true, statut: true } },
        },
        orderBy: { noteGlobale: "desc" },
      },
      resultats: true,
      projet: { select: { id: true, titre: true } },
    },
  });

  if (!appelOffre) return notFound("Appel d'offre");
  return success({ appelOffre });
}

// PUT /api/appels-offres/:id
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.appelOffre.findUnique({ where: { id } });
  if (!existing) return notFound("Appel d'offre");

  const body = await request.json();
  const { dateLimiteDepot, dateOuverture, dateDebutMarche, ...data } = body;

  const updateData: Record<string, unknown> = { ...data };
  if (dateLimiteDepot) updateData.dateLimiteDepot = new Date(dateLimiteDepot);
  if (dateOuverture !== undefined) updateData.dateOuverture = dateOuverture ? new Date(dateOuverture) : null;
  if (dateDebutMarche !== undefined) updateData.dateDebutMarche = dateDebutMarche ? new Date(dateDebutMarche) : null;

  const appelOffre = await prisma.appelOffre.update({ where: { id }, data: updateData });
  return success({ appelOffre });
}

// DELETE /api/appels-offres/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DIRECTEUR");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.appelOffre.findUnique({ where: { id } });
  if (!existing) return notFound("Appel d'offre");

  await prisma.appelOffre.delete({ where: { id } });
  return success({ message: "Appel d'offre supprime." });
}
