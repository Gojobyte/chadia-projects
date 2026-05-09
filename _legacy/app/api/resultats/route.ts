import { prisma } from "@/lib/prisma";
import { success, error, notFound } from "@/lib/utils/api-response";

// GET /api/resultats — Liste des resultats publics (transparence)
// Pas d'auth requise — accessible publiquement
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut");
  const bailleurId = searchParams.get("bailleurId");
  const secteur = searchParams.get("secteur");
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = { estPublic: true };

  if (bailleurId || secteur || dateDebut || dateFin) {
    where.appelOffre = {};
    if (bailleurId) (where.appelOffre as Record<string, unknown>).bailleurId = bailleurId;
    if (secteur) (where.appelOffre as Record<string, unknown>).secteur = secteur;
    if (dateDebut || dateFin) {
      (where.appelOffre as Record<string, unknown>).dateAttribution = {};
      if (dateDebut) ((where.appelOffre as Record<string, unknown>).dateAttribution as Record<string, unknown>).gte = new Date(dateDebut);
      if (dateFin) ((where.appelOffre as Record<string, unknown>).dateAttribution as Record<string, unknown>).lte = new Date(dateFin);
    }
  }

  if (statut) where.appelOffre = { ...(where.appelOffre as Record<string, unknown>), statut };

  const [resultats, total] = await Promise.all([
    prisma.appelOffreResultat.findMany({
      where,
      include: {
        appelOffre: {
          select: {
            reference: true, titre: true, type: true, categorie: true, secteur: true,
            budgetEstime: true, devise: true, datePublication: true, dateLimiteDepot: true,
            bailleur: { select: { nom: true, sigle: true } },
          },
        },
      },
      orderBy: { publieAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appelOffreResultat.count({ where }),
  ]);

  return success({ resultats, total, page, limit, pages: Math.ceil(total / limit) });
}

// GET /api/resultats/:id — Detail d'un resultat
export async function GET_DETAIL(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const resultat = await prisma.appelOffreResultat.findUnique({
    where: { id },
    include: {
      appelOffre: {
        include: {
          bailleur: true,
          _count: { select: { soumissions: true } },
        },
      },
    },
  });

  if (!resultat) return notFound("Resultat");
  return success({ resultat });
}
