import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";
import { updateProjetSchema } from "@/lib/schemas/projet";

// GET /api/projets/:id — Detail d'un projet
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const projet = await prisma.projet.findUnique({
    where: { id },
    include: {
      bailleur: true,
      documents: { orderBy: { ordre: "asc" }, include: { assigneA: { select: { id: true, name: true } } } },
      taches: { orderBy: { createdAt: "desc" }, include: { assigneA: { select: { id: true, name: true } } } },
      membres: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      activites: { orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });

  if (!projet) return notFound("Projet");
  return success({ projet });
}

// PUT /api/projets/:id — Modifier un projet
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.projet.findUnique({ where: { id } });
  if (!existing) return notFound("Projet");

  const body = await request.json();
  const parsed = updateProjetSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message, 400);

  const { dateLimite, datePublication, ...data } = parsed.data;
  const updateData: Record<string, unknown> = { ...data };
  if (dateLimite) updateData.dateLimite = new Date(dateLimite);
  if (datePublication !== undefined) updateData.datePublication = datePublication ? new Date(datePublication) : null;

  const projet = await prisma.projet.update({ where: { id }, data: updateData });

  await prisma.activite.create({
    data: { projetId: id, userId: result.user.id, action: "MODIFICATION", description: `Projet modifie` },
  });

  return success({ projet });
}

// DELETE /api/projets/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("DIRECTEUR");
  if (result.error) return result.error;
  const { id } = await params;

  const existing = await prisma.projet.findUnique({ where: { id } });
  if (!existing) return notFound("Projet");

  await prisma.projet.delete({ where: { id } });
  return success({ message: "Projet supprime." });
}
