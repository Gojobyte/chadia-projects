import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success } from "@/lib/utils/api-response";

// GET /api/analytics — Statistiques globales pour le dashboard
export async function GET() {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalAppelsOffres,
    appelsOffresActifs,
    appelsOffresAttribues,
    totalSoumissions,
    totalFournisseurs,
    fournisseursVerifies,
    budgetTotal,
    budgetAttribue,
    soumissionsParMois,
    topBailleurs,
    repartitionParCategorie,
    repartitionParStatut,
  ] = await Promise.all([
    // Totaux
    prisma.appelOffre.count(),
    prisma.appelOffre.count({ where: { statut: { in: ["PUBLIE", "EN_COURS"] } } }),
    prisma.appelOffre.count({ where: { statut: "ATTRIBUE" } }),
    prisma.soumission.count(),
    prisma.fournisseur.count(),
    prisma.fournisseur.count({ where: { statut: "VERIFIE" } }),
    prisma.appelOffre.aggregate({ _sum: { budgetEstime: true } }),
    prisma.appelOffreResultat.aggregate({ _sum: { montantAttribue: true } }),

    // Soumissions par mois (6 derniers mois)
    prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*) as count
      FROM soumissions
      WHERE "createdAt" >= ${thirtyDaysAgo} - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `,

    // Top bailleurs par nombre d'appels d'offres
    prisma.appelOffre.groupBy({
      by: ["bailleurId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),

    // Repartition par categorie
    prisma.appelOffre.groupBy({
      by: ["categorie"],
      _count: { id: true },
    }),

    // Repartition par statut
    prisma.appelOffre.groupBy({
      by: ["statut"],
      _count: { id: true },
    }),
  ]);

  // Recuperer les noms des bailleurs
  const bailleurIds = topBailleurs.map(b => b.bailleurId);
  const bailleurs = await prisma.bailleur.findMany({
    where: { id: { in: bailleurIds } },
    select: { id: true, nom: true, sigle: true },
  });
  const bailleurMap = new Map(bailleurs.map(b => [b.id, b]));

  const topBailleursWithNames = topBailleurs.map(b => ({
    ...b,
    bailleur: bailleurMap.get(b.bailleurId),
  }));

  return success({
    kpis: {
      totalAppelsOffres,
      appelsOffresActifs,
      appelsOffresAttribues,
      tauxAttribution: totalAppelsOffres > 0 ? Math.round((appelsOffresAttribues / totalAppelsOffres) * 100) : 0,
      totalSoumissions,
      totalFournisseurs,
      fournisseursVerifies,
      tauxVerification: totalFournisseurs > 0 ? Math.round((fournisseursVerifies / totalFournisseurs) * 100) : 0,
      budgetTotal: budgetTotal._sum.budgetEstime ?? 0,
      budgetAttribue: budgetAttribue._sum.montantAttribue ?? 0,
    },
    soumissionsParMois,
    topBailleurs: topBailleursWithNames,
    repartitionParCategorie,
    repartitionParStatut,
  });
}
