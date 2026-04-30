import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error, notFound } from "@/lib/utils/api-response";
import { genererContenu } from "@/lib/ai";

// POST /api/documents/:id/generer — Generer le contenu avec l'IA
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { projet: { include: { bailleur: true, analyseIA: true } } },
  });
  if (!doc) return notFound("Document");

  try {
    const contenu = await genererContenu({
      typeDocument: doc.categorie,
      titreProjet: doc.projet.titre,
      bailleur: doc.projet.bailleur.sigle,
      description: doc.projet.description,
      analyseIA: doc.projet.analyseIA
        ? `Criteres: ${doc.projet.analyseIA.criteres}\nExigences: ${doc.projet.analyseIA.exigences}`
        : undefined,
    });

    // Sauvegarder le contenu genere
    await prisma.document.update({
      where: { id },
      data: { contenu, statut: doc.statut === "BROUILLON" ? "REDACTION" : doc.statut },
    });

    await prisma.activite.create({
      data: { projetId: doc.projetId, userId: session.user.id, action: "GENERATION_IA", description: `Contenu genere par l'IA pour "${doc.titre}"` },
    });

    return success({ contenu });
  } catch (err) {
    console.error("AI generation error:", err);
    return error(`Erreur IA: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}
