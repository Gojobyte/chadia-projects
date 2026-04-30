import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error, notFound } from "@/lib/utils/api-response";
import { analyserAppelOffre } from "@/lib/ai";

// POST /api/projets/:id/analyser — Analyser l'appel d'offres avec l'IA
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return error("Non autorise.", 401);
  const { id } = await params;

  const projet = await prisma.projet.findUnique({ where: { id } });
  if (!projet) return notFound("Projet");

  const body = await request.json();
  const texte = body.texte ?? body.appelOffreTexte;

  if (!texte || texte.length < 50) {
    return error("Le texte de l'appel d'offres est trop court (min 50 caracteres).", 400);
  }

  try {
    const analyse = await analyserAppelOffre(texte);

    // Sauvegarder l'analyse en BDD
    await prisma.analyseIA.upsert({
      where: { projetId: id },
      update: { ...analyse, appelOffreTexte: texte },
      create: { projetId: id, appelOffreTexte: texte, ...analyse },
    });

    await prisma.activite.create({
      data: { projetId: id, userId: session.user.id, action: "ANALYSE_IA", description: "Appel d'offres analyse par l'IA" },
    });

    return success({ analyse });
  } catch (err) {
    console.error("AI error:", err);
    return error(`Erreur IA: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}
