import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error, notFound } from "@/lib/utils/api-response";
import { exportGoogleDoc } from "@/lib/google-docs";

// POST /api/documents/:id/save-content
// Exporte le contenu du Google Doc et le sauvegarde dans la BDD
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);
  const { id } = await params;

  const googleToken = (session as { googleAccessToken?: string }).googleAccessToken;
  if (!googleToken) return error("Google Drive non connecte.", 403);

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return notFound("Document");
  if (!doc.fichierUrl?.includes("docs.google.com")) return error("Pas de Google Doc lie.", 400);

  // Extraire le docId Google
  const match = doc.fichierUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return error("URL Google Doc invalide.", 400);
  const googleDocId = match[1];

  try {
    const contenu = await exportGoogleDoc({ accessToken: googleToken, docId: googleDocId });

    await prisma.document.update({
      where: { id },
      data: { contenu },
    });

    return success({ contenu, message: "Contenu sauvegarde." });
  } catch (err) {
    console.error("Export error:", err);
    return error(`Erreur export: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}
