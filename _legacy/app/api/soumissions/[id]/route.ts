import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";

// GET /api/soumissions/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const soumission = await prisma.soumission.findUnique({
    where: { id },
    include: {
      appelOffre: { include: { bailleur: true } },
      fournisseur: true,
    },
  });

  if (!soumission) return notFound("Soumission");
  return success({ soumission });
}

// PUT /api/soumissions/:id/evaluer — Evaluer une soumission
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.soumission.findUnique({ where: { id } });
  if (!existing) return notFound("Soumission");

  const body = await request.json();
  const { noteTechnique, noteFinanciere, noteGlobale, classement, commentairesEvaluation, statut } = body;

  const soumission = await prisma.soumission.update({
    where: { id },
    data: {
      noteTechnique,
      noteFinanciere,
      noteGlobale,
      classement,
      commentairesEvaluation,
      statut: statut ?? "EN_EVALUATION",
    },
  });

  return success({ soumission });
}

// PATCH /api/soumissions/:id/retenir — Retenir une soumission (attribuer le marche)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DIRECTEUR");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.soumission.findUnique({
    where: { id },
    include: { appelOffre: true },
  });
  if (!existing) return notFound("Soumission");

  // Marquer la soumission comme retenue
  const soumission = await prisma.soumission.update({
    where: { id },
    data: { statut: "RETENUE" },
  });

  // Mettre a jour l'appel d'offre
  await prisma.appelOffre.update({
    where: { id: existing.appelOffreId },
    data: { statut: "ATTRIBUE", dateAttribution: new Date() },
  });

  // Creer le resultat public
  await prisma.appelOffreResultat.upsert({
    where: { appelOffreId: existing.appelOffreId },
    update: {
      soumissionRetenueId: id,
      fournisseurRetenuId: existing.fournisseurId,
      fournisseurRetenuNom: existing.fournisseurId, // Will be populated from fournisseur
      montantAttribue: existing.offreFinanciere,
      devise: existing.devise,
      publieAt: new Date(),
      publiePar: result.user.id,
    },
    create: {
      appelOffreId: existing.appelOffreId,
      soumissionRetenueId: id,
      fournisseurRetenuId: existing.fournisseurId,
      fournisseurRetenuNom: existing.fournisseurId,
      montantAttribue: existing.offreFinanciere,
      devise: existing.devise,
      publieAt: new Date(),
      publiePar: result.user.id,
    },
  });

  // Rejeter les autres soumissions
  await prisma.soumission.updateMany({
    where: { appelOffreId: existing.appelOffreId, id: { not: id } },
    data: { statut: "REJETEE" },
  });

  return success({ soumission });
}
