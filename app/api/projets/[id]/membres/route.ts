import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error } from "@/lib/utils/api-response";

// GET /api/projets/:id/membres — Liste des membres du projet
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const membres = await prisma.projetMembre.findMany({
    where: { projetId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return success({ membres });
}

// POST /api/projets/:id/membres — Ajouter un membre au projet
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const body = await request.json();
  const { userId, role } = body;

  if (!userId) return error("userId requis", 400);

  // Verifier si deja membre
  const existing = await prisma.projetMembre.findUnique({
    where: { projetId_userId: { projetId: id, userId } },
  });
  if (existing) return error("Deja membre du projet", 409);

  const membre = await prisma.projetMembre.create({
    data: { projetId: id, userId, role: role ?? "MEMBRE" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return success({ membre });
}
