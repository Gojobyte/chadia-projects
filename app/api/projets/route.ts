import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, created, error } from "@/lib/utils/api-response";
import { createProjetSchema } from "@/lib/schemas/projet";

// Labels pour les categories de documents
const DOC_LABELS: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique",
  BUDGET_PREVISIONNEL: "Budget previsionnel",
  BUDGET_DETAIL: "Detail budgetaire",
  CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle",
  PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt",
  CV: "CV equipe",
  DOCUMENT_LEGAL: "Documents legaux",
  AUTRE: "Autre document",
};

// GET /api/projets — Liste des projets
export async function GET() {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const projets = await prisma.projet.findMany({
    include: {
      bailleur: { select: { nom: true, sigle: true } },
      _count: { select: { documents: true, taches: true, membres: true } },
      documents: { select: { statut: true } },
      membres: { select: { user: { select: { id: true, name: true } } }, take: 4 },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculer la progression de chaque projet
  const projetsAvecProgression = projets.map((p) => {
    const total = p.documents.length;
    const valides = p.documents.filter((d) => d.statut === "VALIDE").length;
    const progression = total > 0 ? Math.round((valides / total) * 100) : 0;
    return { ...p, progression, documents: undefined };
  });

  return success({ projets: projetsAvecProgression });
}

// POST /api/projets — Creer un projet
export async function POST(request: Request) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;

  const body = await request.json();
  const parsed = createProjetSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);

  const { documents: docCategories, dateLimite, datePublication, ...data } = parsed.data;

  // Creer le projet
  const projet = await prisma.projet.create({
    data: {
      ...data,
      dateLimite: new Date(dateLimite),
      datePublication: datePublication ? new Date(datePublication) : null,
      createdById: result.user.id,
      // Ajouter le createur comme membre Directeur/Admin
      membres: {
        create: { userId: result.user.id, role: result.user.role === "DIRECTEUR" ? "DIRECTEUR" : "ADMIN" },
      },
    },
  });

  // Creer les documents vides pour chaque categorie selectionnee
  if (docCategories.length > 0) {
    await prisma.document.createMany({
      data: docCategories.map((cat, i) => ({
        projetId: projet.id,
        categorie: cat,
        titre: DOC_LABELS[cat] ?? cat,
        ordre: i,
      })),
    });
  }

  // Logger l'activite
  await prisma.activite.create({
    data: {
      projetId: projet.id,
      userId: result.user.id,
      action: "CREATION",
      description: `Projet "${projet.titre}" cree`,
    },
  });

  return created({ projet });
}
