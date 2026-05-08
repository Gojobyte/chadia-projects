import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, created, error, notFound } from "@/lib/utils/api-response";

function generateNumeroSoumission(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const r = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SOU-${y}${m}${d}-${r}`;
}

// GET /api/soumissions — Liste des soumissions (filtres par appel d'offre, fournisseur, statut)
export async function GET(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const appelOffreId = searchParams.get("appelOffreId");
  const fournisseurId = searchParams.get("fournisseurId");
  const statut = searchParams.get("statut");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {};
  if (appelOffreId) where.appelOffreId = appelOffreId;
  if (fournisseurId) where.fournisseurId = fournisseurId;
  if (statut) where.statut = statut;

  const [soumissions, total] = await Promise.all([
    prisma.soumission.findMany({
      where,
      include: {
        appelOffre: { select: { reference: true, titre: true, dateLimiteDepot: true } },
        fournisseur: { select: { raisonSociale: true, sigle: true, statut: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.soumission.count({ where }),
  ]);

  return success({ soumissions, total, page, limit, pages: Math.ceil(total / limit) });
}

// POST /api/soumissions — Soumettre une offre
export async function POST(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const body = await request.json();
  const { appelOffreId, fournisseurId, offreTechnique, offreFinanciere, devise, detailFinancier, documents, delaiExecution, validiteOffre } = body;

  if (!appelOffreId || !fournisseurId) return error("appelOffreId et fournisseurId sont requis.", 400);

  // Verifier que l'appel d'offre existe et est ouvert
  const appelOffre = await prisma.appelOffre.findUnique({ where: { id: appelOffreId } });
  if (!appelOffre) return notFound("Appel d'offre");
  if (appelOffre.statut !== "PUBLIE" && appelOffre.statut !== "EN_COURS") {
    return error("Cet appel d'offre n'est plus ouvert aux soumissions.", 400);
  }
  if (new Date(appelOffre.dateLimiteDepot) < new Date()) {
    return error("La date limite de soumission est depassee.", 400);
  }

  // Verifier que le fournisseur est verifie
  const fournisseur = await prisma.fournisseur.findUnique({ where: { id: fournisseurId } });
  if (!fournisseur) return notFound("Fournisseur");
  if (fournisseur.statut !== "VERIFIE") {
    return error("Le fournisseur doit etre verifie pour soumettre une offre.", 400);
  }

  // Verifier pas de double soumission
  const existing = await prisma.soumission.findUnique({
    where: { appelOffreId_fournisseurId: { appelOffreId, fournisseurId } },
  });
  if (existing) return error("Ce fournisseur a deja soumis une offre pour cet appel d'offre.", 409);

  const soumission = await prisma.soumission.create({
    data: {
      numeroSoumission: generateNumeroSoumission(),
      appelOffreId,
      fournisseurId,
      offreTechnique,
      offreFinanciere,
      devise: devise ?? "FCFA",
      detailFinancier,
      documents,
      delaiExecution,
      validiteOffre,
      statut: "DEPOSEE",
      deposeAt: new Date(),
    },
  });

  return created({ soumission });
}
