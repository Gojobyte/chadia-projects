import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function GET() {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const projets = await prisma.projet.findMany({
    where: { starred: true },
    select: { id: true, titre: true, bailleur: { select: { sigle: true } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  return Response.json({ projets });
}
