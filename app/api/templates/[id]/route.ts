import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";

// GET /api/templates/:id — Detail d'un template
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return notFound("Template");
  return success({ template });
}

// PUT /api/templates/:id — Modifier un template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  const body = await request.json();
  const { titre, description, contenu } = body;

  const template = await prisma.template.update({
    where: { id },
    data: { ...(titre && { titre }), ...(description !== undefined && { description }), ...(contenu && { contenu }) },
  });

  return success({ template });
}

// DELETE /api/templates/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("ADMIN");
  if (result.error) return result.error;
  const { id } = await params;

  await prisma.template.delete({ where: { id } });
  return success({ message: "Template supprime." });
}
