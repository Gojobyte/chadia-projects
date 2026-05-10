/**
 * PUT /api/projets/[id]/key-questions/[index]
 *
 * Upsert la réponse à une keyQuestion du projet.
 */

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id, index: indexStr } = await params;
  const questionIndex = parseInt(indexStr, 10);

  if (isNaN(questionIndex)) {
    return Response.json({ error: "Index invalide" }, { status: 400 });
  }

  const body = await request.json();
  const { answer, targetSectionId } = body as { answer?: string; targetSectionId?: string };

  // Vérifier que la question existe dans l'AnalyseIA
  const analyse = await prisma.analyseIA.findUnique({
    where: { projetId: id },
    select: { keyQuestions: true },
  });

  if (!analyse?.keyQuestions) {
    return Response.json({ error: "Pas d'analyse IA pour ce projet" }, { status: 404 });
  }

  const keyQuestions = analyse.keyQuestions as string[];
  if (questionIndex < 0 || questionIndex >= keyQuestions.length) {
    return Response.json({ error: "Index hors limites" }, { status: 400 });
  }

  // Upsert la réponse
  const data = {
    projetId: id,
    questionIndex,
    questionText: keyQuestions[questionIndex],
    answer: answer ?? null,
    targetSectionId: targetSectionId ?? null,
    answeredById: answer ? result.user.id : null,
    answeredAt: answer ? new Date() : null,
  };

  const saved = await prisma.projetKeyQuestionAnswer.upsert({
    where: { projetId_questionIndex: { projetId: id, questionIndex } },
    create: data,
    update: {
      answer: data.answer,
      targetSectionId: data.targetSectionId,
      answeredById: data.answeredById,
      answeredAt: data.answeredAt,
    },
  });

  return Response.json({ answer: saved });
}
