import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";

// GET /api/fournisseurs/:id — Detail d'un fournisseur
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const fournisseur = await prisma.fournisseur.findUnique({
    where: { id },
    include: {
      soumissions: {
        include: { appelOffre: { select: { reference: true, titre: true, statut: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      evaluations: { orderBy: { evalueAt: "desc" }, take: 10 },
      _count: { select: { soumissions: true, evaluations: true } },
    },
  });

  if (!fournisseur) return notFound("Fournisseur");
  return success({ fournisseur });
}

// PUT /api/fournisseurs/:id — Modifier un fournisseur
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.fournisseur.findUnique({ where: { id } });
  if (!existing) return notFound("Fournisseur");

  const body = await request.json();
  const fournisseur = await prisma.fournisseur.update({ where: { id }, data: body });
  return success({ fournisseur });
}

// PATCH /api/fournisseurs/:id/verifier — Verifier un fournisseur
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.fournisseur.findUnique({ where: { id } });
  if (!existing) return notFound("Fournisseur");

  const body = await request.json();
  const { statut, notes } = body;

  const fournisseur = await prisma.fournisseur.update({
    where: { id },
    data: {
      statut: statut ?? "VERIFIE",
      verifiePar: result.user.id,
      verifieAt: new Date(),
      notesVerification: notes,
    },
  });

  return success({ fournisseur });
}
