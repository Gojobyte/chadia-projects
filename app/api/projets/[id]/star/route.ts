import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const projet = await prisma.projet.findUnique({ where: { id }, select: { starred: true } });
  if (!projet) return Response.json({ error: "Projet introuvable" }, { status: 404 });

  const updated = await prisma.projet.update({
    where: { id },
    data: { starred: !projet.starred },
    select: { id: true, starred: true },
  });

  return Response.json({ projet: updated });
}
