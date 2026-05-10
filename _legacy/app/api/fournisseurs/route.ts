import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, created, error, notFound } from "@/lib/utils/api-response";
import { z } from "zod/v4";

const fournisseurSchema = z.object({
  raisonSociale: z.string().min(2),
  sigle: z.string().optional(),
  categorie: z.enum(["ENTREPRISE_INDIVIDUELLE", "SARL", "SA", "ONG_NATIONALE", "ONG_INTERNATIONALE", "COOPERATIVE", "CONSORTIUM", "AUTRE"]).optional(),
  numeroRccm: z.string().optional(),
  numeroNif: z.string().optional(),
  email: z.string().email(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  siteWeb: z.string().optional(),
  representantNom: z.string().optional(),
  representantTitre: z.string().optional(),
  domainesExpertise: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  anneesExperience: z.number().int().optional(),
  effectif: z.number().int().optional(),
  chiffreAffaires: z.number().optional(),
});

// GET /api/fournisseurs — Liste avec recherche et filtres
export async function GET(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const statut = searchParams.get("statut");
  const categorie = searchParams.get("categorie");
  const secteur = searchParams.get("secteur");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { raisonSociale: { contains: q, mode: "insensitive" } },
      { sigle: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { numeroRccm: { contains: q, mode: "insensitive" } },
    ];
  }
  if (statut) where.statut = statut;
  if (categorie) where.categorie = categorie;
  if (secteur) where.domainesExpertise = { has: secteur };

  const [fournisseurs, total] = await Promise.all([
    prisma.fournisseur.findMany({
      where,
      include: {
        _count: { select: { soumissions: true, evaluations: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.fournisseur.count({ where }),
  ]);

  return success({ fournisseurs, total, page, limit, pages: Math.ceil(total / limit) });
}

// POST /api/fournisseurs — Inscription d'un fournisseur
export async function POST(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const body = await request.json();
  const parsed = fournisseurSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);

  const existing = await prisma.fournisseur.findUnique({ where: { email: parsed.data.email } });
  if (existing) return error("Un fournisseur avec cet email existe deja.", 409);

  const fournisseur = await prisma.fournisseur.create({ data: parsed.data });
  return created({ fournisseur });
}
