import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success } from "@/lib/utils/api-response";

// GET /api/templates — Liste des templates
export async function GET(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const categorie = searchParams.get("categorie");

  const templates = await prisma.template.findMany({
    where: categorie ? { categorie: categorie as never } : {},
    orderBy: { categorie: "asc" },
  });

  return success({ templates });
}

// POST /api/templates — Creer un template
export async function POST(request: Request) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;

  const body = await request.json();
  const { categorie, titre, description, contenu } = body;

  if (!categorie || !titre || !contenu) {
    return success({ error: "categorie, titre et contenu requis" });
  }

  const template = await prisma.template.create({
    data: { categorie, titre, description: description ?? null, contenu },
  });

  return success({ template });
}
