/**
 * GET  /api/documents/[id]/section-questions — retourne les questions + réponses
 * POST /api/documents/[id]/section-questions — génère les questions par section via IA
 * PUT  /api/documents/[id]/section-questions — met à jour une réponse
 */

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { completeWithFallback } from "@/lib/ai/providers/factory";
import { logLLMInteraction } from "@/lib/ai/logger";
import { SECTION_QUESTIONS_SYSTEM, buildSectionQuestionsPrompt } from "@/lib/ai/prompts/sectionQuestions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const qa = await prisma.documentSectionQA.findUnique({ where: { documentId: id } });

  if (!qa) {
    return Response.json({ questions: null, message: "Questions non encore générées" });
  }

  return Response.json({
    sectionId: qa.sectionId,
    questions: qa.questions,
    generatedAt: qa.generatedAt,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  // Récupérer le document + projet + analyseIA
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      projet: {
        include: {
          analyseIA: { select: { requiredSections: true, evaluationCriteria: true, eligibility: true, crossCutting: true, donorMetadata: true } },
        },
      },
    },
  });

  if (!doc) return Response.json({ error: "Document introuvable" }, { status: 404 });
  if (!doc.sectionId) return Response.json({ error: "Ce document n'est pas lié à une section TDR" }, { status: 400 });
  if (!doc.projet.analyseIA) return Response.json({ error: "Pas d'analyse IA pour ce projet" }, { status: 400 });

  const ia = doc.projet.analyseIA;
  const sections = (ia.requiredSections as Array<{ id: string; title: string; description: string }>) ?? [];
  const section = sections.find(s => s.id === doc.sectionId);

  if (!section) {
    return Response.json({ error: `Section "${doc.sectionId}" non trouvée dans l'analyse` }, { status: 400 });
  }

  const donor = (ia.donorMetadata as { name: string; program: string | null }) ?? { name: "Bailleur", program: null };
  const criteria = (ia.evaluationCriteria as Array<{ name: string; weight: number; subcriteria: string[] }>) ?? [];
  const eligibility = (ia.eligibility as { sectors: string[]; countries: string[] }) ?? { sectors: [], countries: [] };
  const crossCutting = (ia.crossCutting as { genderMarker?: number | null; doNoHarm?: boolean; nexusApproach?: boolean }) ?? {};

  try {
    const prompt = buildSectionQuestionsPrompt({
      sectionTitle: section.title,
      sectionDescription: section.description,
      donorName: donor.name,
      donorProgram: donor.program,
      evaluationCriteria: criteria,
      eligibility,
      crossCutting,
    });

    const response = await completeWithFallback("section_questions", {
      messages: [
        { role: "system", content: SECTION_QUESTIONS_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    });

    // Parser les questions
    let questions: Array<{ id: string; text: string; category: string; answer: string | null; answeredAt: string | null }> = [];
    try {
      const cleaned = response.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      questions = (parsed.questions ?? []).map((q: { id: string; text: string; category: string }) => ({
        ...q,
        answer: null,
        answeredAt: null,
      }));
    } catch {
      return Response.json({ error: "Erreur de parsing des questions IA" }, { status: 422 });
    }

    // Upsert DocumentSectionQA
    const qa = await prisma.documentSectionQA.upsert({
      where: { documentId: id },
      create: { documentId: id, sectionId: doc.sectionId, questions },
      update: { questions, generatedAt: new Date() },
    });

    await logLLMInteraction({
      userId: result.user.id,
      projetId: doc.projetId,
      action: "section_questions",
      inputPrompt: prompt.slice(0, 500),
      response,
      status: "success",
    });

    return Response.json({
      sectionId: qa.sectionId,
      questions: qa.questions,
      generatedAt: qa.generatedAt,
      cost: { tokensIn: response.tokensIn, tokensOut: response.tokensOut, costUsd: response.costUsd },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const body = await request.json();
  const { questionId, answer } = body as { questionId: string; answer: string };

  const qa = await prisma.documentSectionQA.findUnique({ where: { documentId: id } });
  if (!qa) return Response.json({ error: "Questions non générées" }, { status: 404 });

  // Mettre à jour la réponse dans le JSON
  const questions = qa.questions as Array<{ id: string; text: string; category: string; answer: string | null; answeredAt: string | null }>;
  const updated = questions.map(q =>
    q.id === questionId ? { ...q, answer, answeredAt: new Date().toISOString() } : q
  );

  await prisma.documentSectionQA.update({
    where: { documentId: id },
    data: { questions: updated },
  });

  return Response.json({ questions: updated });
}
