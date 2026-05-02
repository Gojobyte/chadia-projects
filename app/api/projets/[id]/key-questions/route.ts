/**
 * GET /api/projets/[id]/key-questions
 *
 * Retourne les keyQuestions de l'AnalyseIA du projet, mergées avec les
 * réponses existantes de ProjetKeyQuestionAnswer.
 */

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  // Récupérer l'AnalyseIA du projet
  const analyse = await prisma.analyseIA.findUnique({
    where: { projetId: id },
    select: { keyQuestions: true },
  });

  if (!analyse || !analyse.keyQuestions) {
    return Response.json({ questions: [], message: "Pas d'analyse IA pour ce projet" });
  }

  const keyQuestions = analyse.keyQuestions as string[];

  // Récupérer les réponses existantes
  const answers = await prisma.projetKeyQuestionAnswer.findMany({
    where: { projetId: id },
    orderBy: { questionIndex: "asc" },
    select: {
      questionIndex: true,
      answer: true,
      targetSectionId: true,
      answeredAt: true,
      answeredBy: { select: { name: true } },
    },
  });

  // Merger questions + réponses
  const merged = keyQuestions.map((questionText, index) => {
    const existing = answers.find(a => a.questionIndex === index);
    return {
      index,
      questionText,
      answer: existing?.answer ?? null,
      targetSectionId: existing?.targetSectionId ?? null,
      answeredAt: existing?.answeredAt ?? null,
      answeredBy: existing?.answeredBy?.name ?? null,
    };
  });

  const answeredCount = merged.filter(q => q.answer).length;

  return Response.json({
    questions: merged,
    total: keyQuestions.length,
    answered: answeredCount,
    progress: keyQuestions.length > 0 ? Math.round((answeredCount / keyQuestions.length) * 100) : 0,
  });
}
