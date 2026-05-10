import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error, notFound } from "@/lib/utils/api-response";
import { createGoogleDoc } from "@/lib/google-docs";

// POST /api/documents/:id/create-google-doc
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);
  const { id } = await params;

  // Verifier le token Google
  const googleToken = (session as { googleAccessToken?: string }).googleAccessToken;
  if (!googleToken) {
    return error("Connectez votre compte Google pour creer des documents. Allez dans Parametres > Connecter Google Drive.", 403);
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { projet: { include: { bailleur: true } } },
  });
  if (!doc) return notFound("Document");

  if (doc.fichierUrl?.includes("docs.google.com")) {
    return success({ url: doc.fichierUrl });
  }

  const template = await prisma.template.findFirst({ where: { categorie: doc.categorie } });

  try {
    const { url } = await createGoogleDoc({
      accessToken: googleToken,
      title: `${doc.projet.titre} — ${doc.titre}`,
      templateContent: template?.contenu ?? undefined,
    });

    await prisma.document.update({
      where: { id },
      data: { fichierUrl: url, statut: doc.statut === "BROUILLON" ? "REDACTION" : doc.statut },
    });

    await prisma.activite.create({
      data: { projetId: doc.projetId, userId: session.user.id, action: "CREATION_GDOC", description: `Google Doc cree pour "${doc.titre}"` },
    });

    return success({ url });
  } catch (err) {
    console.error("Google Docs error:", err);
    return error(`Erreur: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}
