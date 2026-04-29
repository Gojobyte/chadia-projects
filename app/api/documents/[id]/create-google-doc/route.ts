import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { success, error, notFound } from "@/lib/utils/api-response";
import { createGoogleDoc, isGoogleDocsConfigured } from "@/lib/google-docs";

// POST /api/documents/:id/create-google-doc
// Cree un Google Doc pour ce document et stocke l'URL
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  if (!isGoogleDocsConfigured()) {
    return error("Google Docs n'est pas configure. Ajoutez GOOGLE_SERVICE_ACCOUNT_EMAIL et GOOGLE_SERVICE_ACCOUNT_KEY.", 500);
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { projet: { include: { bailleur: true } } },
  });
  if (!doc) return notFound("Document");

  // Si un Google Doc existe deja, le retourner
  if (doc.fichierUrl?.includes("docs.google.com")) {
    return success({ url: doc.fichierUrl });
  }

  // Chercher le template correspondant a la categorie
  const template = await prisma.template.findFirst({
    where: { categorie: doc.categorie },
  });

  try {
    // Creer le Google Doc
    const title = `${doc.projet.titre} — ${doc.titre}`;
    const { url } = await createGoogleDoc({
      title,
      shareWithEmail: result.user.email ?? undefined,
      templateContent: template?.contenu ?? undefined,
    });

    // Sauvegarder l'URL dans la BDD
    await prisma.document.update({
      where: { id },
      data: { fichierUrl: url, statut: doc.statut === "A_FAIRE" ? "EN_COURS" : doc.statut },
    });

    // Logger
    await prisma.activite.create({
      data: {
        projetId: doc.projetId,
        userId: result.user.id,
        action: "CREATION_GDOC",
        description: `Google Doc cree pour "${doc.titre}"`,
      },
    });

    return success({ url });
  } catch (err) {
    console.error("Google Docs error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return error(`Erreur Google Docs: ${message}`, 500);
  }
}
