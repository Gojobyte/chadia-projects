/**
 * POST /api/projets/from-tdr
 *
 * Crée un projet complet à partir d'une TDRAnalysis validée par l'utilisateur.
 * Crée automatiquement : le projet, l'AnalyseIA, les documents vides, les tâches Kanban.
 */

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { completeWithFallback } from "@/lib/ai/providers/factory";
import { KEY_QUESTION_MAPPER_SYSTEM, buildKeyQuestionMapperPrompt } from "@/lib/ai/prompts/keyQuestionMapper";
import type { TDRAnalysis } from "@/lib/ai/schemas/tdrAnalysis";

// Mapping section ID → catégorie de document
const SECTION_TO_CATEGORY: Record<string, string> = {
  executive_summary: "NOTE_CONCEPTUELLE",
  context_analysis: "PROPOSITION_TECHNIQUE",
  problem_statement: "PROPOSITION_TECHNIQUE",
  theory_of_change: "THEORIE_DU_CHANGEMENT",
  methodology: "PROPOSITION_TECHNIQUE",
  logframe: "CADRE_LOGIQUE",
  workplan: "PLAN_TRAVAIL",
  budget_narrative: "BUDGET_PREVISIONNEL",
  budget_detailed: "BUDGET_DETAIL",
  team_composition: "CV",
  risk_analysis: "PROPOSITION_TECHNIQUE",
  sustainability: "PROPOSITION_TECHNIQUE",
  gantt: "GANTT",
};

const ANNEX_TO_CATEGORY: Record<string, string> = {
  logframe: "CADRE_LOGIQUE",
  budget: "BUDGET_PREVISIONNEL",
  budget_detailed: "BUDGET_DETAIL",
  cv_team: "CV",
  org_chart: "DOCUMENT_LEGAL",
  gantt: "GANTT",
  partner_letter: "LETTRE_PARTENAIRE",
  registration: "DOCUMENT_LEGAL",
  audit: "DOCUMENT_LEGAL",
};

export async function POST(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  try {
    const body = await request.json();
    const { analysis, overrides, bailleurId, source } = body as {
      analysis: TDRAnalysis;
      overrides?: Partial<TDRAnalysis>;
      bailleurId: string;
      source?: { type: string; url?: string; fileName?: string; rawText?: string };
    };

    if (!analysis || !bailleurId) {
      return Response.json({ error: "analysis et bailleurId requis" }, { status: 400 });
    }

    // Fusionner les overrides de l'utilisateur
    const final = { ...analysis, ...overrides } as TDRAnalysis;

    // Déterminer la devise
    const devise = final.budget?.currency ?? "EUR";

    // Créer le projet
    const projet = await prisma.projet.create({
      data: {
        titre: `Réponse ${final.donor.name} — ${final.donor.program ?? final.donor.referenceNumber ?? ""}`.trim(),
        reference: final.donor.referenceNumber ?? null,
        description: `Appel à propositions ${final.donor.name}. ${final.eligibility.sectors.join(", ")}. Pays : ${final.eligibility.countries.join(", ")}.`,
        bailleurId,
        budget: final.budget.maxAmount ?? final.budget.minAmount ?? null,
        devise,
        dateLimite: new Date(final.timeline.submissionDeadline),
        datePublication: final.timeline.publishDate ? new Date(final.timeline.publishDate) : null,
        pays: final.eligibility.countries.join(", ") || null,
        statut: "BROUILLON",
        createdById: result.user.id,
        membres: {
          create: {
            userId: result.user.id,
            role: result.user.role === "DIRECTEUR" ? "DIRECTEUR" : "ADMIN",
          },
        },
      },
    });

    // Créer l'AnalyseIA avec toutes les données structurées
    await prisma.analyseIA.create({
      data: {
        projetId: projet.id,
        appelOffreTexte: source?.rawText?.slice(0, 50000) ?? null,
        criteres: final.evaluationCriteria.map(c => `${c.name} (${c.weight}%)`).join("\n"),
        exigences: final.complianceWarnings.join("\n"),
        documentsRequis: final.requiredSections.map(s => s.title).join("\n"),
        budgetEstime: final.budget.maxAmount ? `${final.budget.maxAmount} ${devise}` : null,
        recommandations: final.keyQuestions.join("\n"),
        // Nouveaux champs structurés
        donorMetadata: final.donor,
        timeline: final.timeline,
        budgetConstraints: final.budget,
        eligibility: final.eligibility,
        requiredSections: final.requiredSections,
        evaluationCriteria: final.evaluationCriteria,
        requiredAnnexes: final.requiredAnnexes,
        crossCutting: final.crossCuttingRequirements,
        keyQuestions: final.keyQuestions,
        complianceWarnings: final.complianceWarnings,
        sourceType: (source?.type?.toUpperCase() as "PDF" | "URL" | "MANUAL") ?? "MANUAL",
        sourceUrl: source?.url ?? null,
        sourceFileName: source?.fileName ?? null,
        rawText: source?.rawText?.slice(0, 100000) ?? null,
        extractedAt: new Date(),
      },
    });

    // Créer les documents pour chaque section obligatoire
    const documentIds: string[] = [];
    for (let i = 0; i < final.requiredSections.length; i++) {
      const section = final.requiredSections[i];
      const categorie = SECTION_TO_CATEGORY[section.id] ?? "PROPOSITION_TECHNIQUE";
      const doc = await prisma.document.create({
        data: {
          projetId: projet.id,
          titre: section.title,
          description: section.description,
          categorie: categorie as never,
          ordre: i,
          statut: "BROUILLON",
          sectionId: section.id, // lien avec requiredSections
        },
      });
      documentIds.push(doc.id);
    }

    // Créer les documents pour les annexes
    for (let i = 0; i < final.requiredAnnexes.length; i++) {
      const annex = final.requiredAnnexes[i];
      const categorie = ANNEX_TO_CATEGORY[annex.id] ?? "ANNEXE";
      const doc = await prisma.document.create({
        data: {
          projetId: projet.id,
          titre: annex.title,
          categorie: categorie as never,
          ordre: final.requiredSections.length + i,
          statut: "BROUILLON",
        },
      });
      documentIds.push(doc.id);
    }

    // Créer les tâches Kanban
    const tacheIds: string[] = [];
    const tachesACreer = [
      { titre: "Lire et analyser le TDR complet", priorite: "HAUTE" },
      { titre: `Vérifier l'éligibilité de l'organisation`, priorite: "HAUTE" },
      ...final.requiredSections.map(s => ({
        titre: `Rédiger : ${s.title}`,
        priorite: s.weight && s.weight >= 20 ? "HAUTE" : "MOYENNE" as string,
      })),
      ...final.requiredAnnexes.map(a => ({
        titre: `Préparer : ${a.title}`,
        priorite: "MOYENNE" as string,
      })),
      { titre: "Relecture finale et mise en forme", priorite: "HAUTE" },
      { titre: "Soumettre avant la deadline", priorite: "HAUTE" },
    ];

    for (const tache of tachesACreer) {
      const t = await prisma.tache.create({
        data: {
          projetId: projet.id,
          titre: tache.titre,
          priorite: tache.priorite as never,
          statut: "A_FAIRE",
          dateLimite: new Date(final.timeline.submissionDeadline),
        },
      });
      tacheIds.push(t.id);
    }

    // Auto-distribuer les keyQuestions vers les sections + persister
    if (final.keyQuestions && final.keyQuestions.length > 0) {
      let mappings: Record<number, string> = {};

      // Essayer l'auto-distribution IA (non-bloquant)
      try {
        const sections = final.requiredSections.map(s => ({ id: s.id, title: s.title }));
        const mapperResponse = await completeWithFallback("quick_suggestion", {
          messages: [
            { role: "system", content: KEY_QUESTION_MAPPER_SYSTEM },
            { role: "user", content: buildKeyQuestionMapperPrompt(sections, final.keyQuestions) },
          ],
          temperature: 0.1,
          maxTokens: 2048,
          jsonMode: true,
        });

        const mapperJson = JSON.parse(
          mapperResponse.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        );
        if (mapperJson?.mappings) {
          for (const m of mapperJson.mappings) {
            mappings[m.questionIndex] = m.sectionId;
          }
        }
      } catch (err) {
        console.warn("[from-tdr] Auto-distribution keyQuestions échouée, pas bloquant:", err);
      }

      // Créer les ProjetKeyQuestionAnswer
      for (let i = 0; i < final.keyQuestions.length; i++) {
        await prisma.projetKeyQuestionAnswer.create({
          data: {
            projetId: projet.id,
            questionIndex: i,
            questionText: final.keyQuestions[i],
            targetSectionId: mappings[i] ?? null,
          },
        });
      }
    }

    // Logger l'activité
    await prisma.activite.create({
      data: {
        projetId: projet.id,
        userId: result.user.id,
        action: "CREATION_TDR",
        description: `Projet créé via le wizard TDR (${final.donor.name})`,
      },
    });

    return Response.json({
      projet: { id: projet.id, titre: projet.titre },
      documentIds,
      tacheIds,
      stats: {
        documents: documentIds.length,
        taches: tacheIds.length,
        sections: final.requiredSections.length,
        annexes: final.requiredAnnexes.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur interne";
    console.error("[from-tdr] Erreur:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
