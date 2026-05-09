import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success } from "@/lib/utils/api-response";

// GET /api/users — Liste de tous les utilisateurs
export async function GET() {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return success({ users });
}
