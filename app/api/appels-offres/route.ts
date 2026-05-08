import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, created, error, notFound } from "@/lib/utils/api-response";
import { z } from "zod/v4";

const appelOffreSchema = z.object({
  reference: z.string().min(2),
  titre: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(["APPEL_OFFRES_OUVERT", "APPEL_OFFRES_RESTREINT", "MARCHE_NEGOCIE", "CONSULTATION", "GRE_A_GRE"]).optional(),
  categorie: z.enum(["TRAVAUX", "FOURNITURES", "SERVICES", "MIXTE"]).optional(),
  secteur: z.string().optional(),
  bailleurId: z.string().min(1),
  budgetEstime: z.number().optional(),
  devise: z.string().optional(),
  dateLimiteDepot: z.string().min(1),
  dateOuverture: z.string().optional(),
  dateDebutMarche: z.string().optional(),
  dureeMarche: z.number().int().optional(),
  pays: z.string().optional(),
  region: z.string().optional(),
  lieuExecution: z.string().optional(),
  criteresEligibilite: z.record(z.string(), z.unknown()).optional(),
  criteresEvaluation: z.array(z.record(z.string(), z.unknown())).optional(),
  documentsAppelOffre: z.array(z.record(z.string(), z.unknown())).optional(),
  projetId: z.string().optional(),
});

// GET /api/appels-offres — Liste avec recherche, filtres, pagination
export async function GET(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const statut = searchParams.get("statut");
  const type = searchParams.get("type");
  const categorie = searchParams.get("categorie");
  const secteur = searchParams.get("secteur");
  const bailleurId = searchParams.get("bailleurId");
  const estPublic = searchParams.get("estPublic");
  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const sortBy = searchParams.get("sortBy") ?? "dateLimiteDepot";
  const sortOrder = searchParams.get("sortOrder") ?? "asc";

  const where: Record<string, unknown> = {};

  // Recherche texte
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { titre: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  // Filtres
  if (statut) where.statut = statut;
  if (type) where.type = type;
  if (categorie) where.categorie = categorie;
  if (secteur) where.secteur = secteur;
  if (bailleurId) where.bailleurId = bailleurId;
  if (estPublic !== null) where.estPublic = estPublic === "true";

  // Filtre par date limite
  if (dateDebut || dateFin) {
    where.dateLimiteDepot = {};
    if (dateDebut) (where.dateLimiteDepot as Record<string, unknown>).gte = new Date(dateDebut);
    if (dateFin) (where.dateLimiteDepot as Record<string, unknown>).lte = new Date(dateFin);
  }

  const orderBy: Record<string, string> = {};
  orderBy[sortBy] = sortOrder;

  const [appelsOffres, total] = await Promise.all([
    prisma.appelOffre.findMany({
      where,
      include: {
        bailleur: { select: { nom: true, sigle: true } },
        _count: { select: { soumissions: true } },
        resultats: { select: { fournisseurRetenuNom: true, montantAttribue: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appelOffre.count({ where }),
  ]);

  return success({ appelsOffres, total, page, limit, pages: Math.ceil(total / limit) });
}

// POST /api/appels-offres — Creer un appel d'offre
export async function POST(request: Request) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;

  const body = await request.json();
  const parsed = appelOffreSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);

  const { dateLimiteDepot, dateOuverture, dateDebutMarche, criteresEligibilite, criteresEvaluation, documentsAppelOffre, type, categorie, ...data } = parsed.data;

  // Verifier l'unicite de la reference
  const existing = await prisma.appelOffre.findUnique({ where: { reference: data.reference } });
  if (existing) return error("Un appel d'offre avec cette reference existe deja.", 409);

  const createData: Record<string, unknown> = {
    ...data,
    type: type ?? "APPEL_OFFRES_OUVERT",
    categorie: categorie ?? "SERVICES",
    dateLimiteDepot: new Date(dateLimiteDepot),
    dateOuverture: dateOuverture ? new Date(dateOuverture) : null,
    dateDebutMarche: dateDebutMarche ? new Date(dateDebutMarche) : null,
    createdBy: result.user.id,
  };
  if (criteresEligibilite) createData.criteresEligibilite = criteresEligibilite;
  if (criteresEvaluation) createData.criteresEvaluation = criteresEvaluation;
  if (documentsAppelOffre) createData.documentsAppelOffre = documentsAppelOffre;

  const appelOffre = await prisma.appelOffre.create({
    data: createData as Parameters<typeof prisma.appelOffre.create>[0]["data"],
  });

  // Notifier les utilisateurs abonnes a ce secteur/bailleur
  await prisma.alerte.create({
    data: {
      userId: result.user.id,
      type: "NOUVEL_APPEL_OFFRE",
      titre: `Nouvel appel d'offre: ${appelOffre.titre}`,
      message: `Reference: ${appelOffre.reference}`,
      lien: `/appels-offres/${appelOffre.id}`,
      appelOffreId: appelOffre.id,
    },
  });

  return created({ appelOffre });
}
