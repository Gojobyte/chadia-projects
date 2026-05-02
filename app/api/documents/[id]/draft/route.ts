/**
 * POST /api/documents/[id]/draft
 *
 * Génère un brouillon de section basé sur :
 * - Les réponses aux questions de section (DocumentSectionQA)
 * - Les keyQuestions pertinentes (targetSectionId)
 * - Le contexte TDR (AnalyseIA)
 * - Le contenu existant
 */

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { completeWithFallback } from "@/lib/ai/providers/factory";
import { logLLMInteraction } from "@/lib/ai/logger";
import { SECTION_DRAFT_SYSTEM, buildSectionDraftPrompt } from "@/lib/ai/prompts/sectionDraft";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  // Charger le document + contexte complet
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      sectionQA: true,
      projet: {
        include: {
          analyseIA: {
            select: {
              requiredSections: true,
              evaluationCriteria: true,
              donorMetadata: true,
              crossCutting: true,
            },
          },
          keyQuestionAnswers: {
            where: { answer: { not: null } },
            select: { questionText: true, answer: true, targetSectionId: true },
          },
        },
      },
    },
  });

  if (!doc) return Response.json({ error: "Document introuvable" }, { status: 404 });
  if (!doc.sectionId) return Response.json({ error: "Ce document n'est pas lié à une section TDR" }, { status: 400 });

  const ia = doc.projet.analyseIA;
  if (!ia) return Response.json({ error: "Pas d'analyse IA" }, { status: 400 });

  // Trouver la section
  const sections = (ia.requiredSections as Array<{ id: string; title: string; description: string; maxPages: number | null }>) ?? [];
  const section = sections.find(s => s.id === doc.sectionId);
  if (!section) return Response.json({ error: "Section non trouvée" }, { status: 400 });

  // Collecter les Q&A de la section
  const sectionQA = doc.sectionQA;
  const sectionQuestions = (sectionQA?.questions as Array<{ text: string; answer: string | null }>) ?? [];
  const answeredQA = sectionQuestions.filter(q => q.answer).map(q => ({
    question: q.text,
    answer: q.answer!,
  }));

  if (answeredQA.length === 0) {
    return Response.json({ error: "Répondez à au moins une question avant de générer un brouillon" }, { status: 400 });
  }

  // Collecter les keyQuestions pertinentes pour cette section
  const relevantKeyQuestions = doc.projet.keyQuestionAnswers
    .filter(kq => kq.targetSectionId === doc.sectionId && kq.answer)
    .map(kq => ({ question: kq.questionText, answer: kq.answer! }));

  // Extraire les mots-clés évaluatifs
  const criteria = (ia.evaluationCriteria as Array<{ name: string; subcriteria: string[] }>) ?? [];
  const evaluationKeywords = criteria.flatMap(c => [c.name, ...c.subcriteria]).slice(0, 15);

  const donor = (ia.donorMetadata as { name: string }) ?? { name: "Bailleur" };

  try {
    const prompt = buildSectionDraftPrompt({
      sectionTitle: section.title,
      sectionDescription: section.description,
      donorName: donor.name,
      qaPairs: answeredQA,
      relevantKeyQuestions,
      existingContent: doc.contenu ?? "",
      maxPages: section.maxPages,
      evaluationKeywords,
    });

    const response = await completeWithFallback("paragraph_draft", {
      messages: [
        { role: "system", content: SECTION_DRAFT_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 8192,
    });

    // Nettoyer le HTML
    let html = response.content
      .replace(/```html\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Mettre à jour le lastDraftAt
    if (sectionQA) {
      await prisma.documentSectionQA.update({
        where: { documentId: id },
        data: { lastDraftAt: new Date(), draftCostUsd: response.costUsd },
      });
    }

    await logLLMInteraction({
      userId: result.user.id,
      projetId: doc.projetId,
      action: "section_draft",
      inputPrompt: prompt.slice(0, 500),
      response,
      status: "success",
    });

    return Response.json({
      html,
      cost: {
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        costUsd: response.costUsd,
        durationMs: response.durationMs,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    return Response.json({ error: msg }, { status: 500 });
  }
}
