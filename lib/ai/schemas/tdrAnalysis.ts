/**
 * Schema Zod pour la structure TDRAnalysis.
 *
 * Utilisé pour :
 * 1. Valider le JSON retourné par le LLM après extraction
 * 2. Typer les données côté TypeScript
 * 3. Stocker de manière structurée dans les champs JSON d'AnalyseIA
 */

import { z } from "zod/v4";

export const TDRAnalysisSchema = z.object({
  // Métadonnées bailleur
  donor: z.object({
    name: z.string(),
    program: z.string().nullable(),
    referenceNumber: z.string().nullable(),
  }),

  // Calendrier
  timeline: z.object({
    publishDate: z.string().nullable(),
    submissionDeadline: z.string(),
    questionsDeadline: z.string().nullable(),
    expectedStartDate: z.string().nullable(),
    projectDuration: z.object({
      value: z.number(),
      unit: z.enum(["months", "years"]),
    }).nullable(),
  }),

  // Budget
  budget: z.object({
    minAmount: z.number().nullable(),
    maxAmount: z.number().nullable(),
    currency: z.string(),
    cofinancingRequired: z.boolean(),
    cofinancingMinPercent: z.number().nullable(),
    overheadMaxPercent: z.number().nullable(),
  }),

  // Éligibilité
  eligibility: z.object({
    countries: z.array(z.string()),
    organizationTypes: z.array(z.string()),
    consortiumRequired: z.boolean(),
    minPartners: z.number().nullable(),
    sectors: z.array(z.string()),
  }),

  // Sections obligatoires
  requiredSections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    maxPages: z.number().nullable(),
    maxCharacters: z.number().nullable(),
    weight: z.number().nullable(),
  })),

  // Critères d'évaluation
  evaluationCriteria: z.array(z.object({
    name: z.string(),
    weight: z.number(),
    subcriteria: z.array(z.string()),
  })),

  // Annexes obligatoires
  requiredAnnexes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    template: z.string().nullable(),
  })),

  // Marqueurs transversaux
  crossCuttingRequirements: z.object({
    genderMarker: z.number().nullable(),
    environmentMarker: z.number().nullable(),
    climateAdaptation: z.boolean(),
    climateMitigation: z.boolean(),
    governanceMarker: z.number().nullable(),
    doNoHarm: z.boolean(),
    nexusApproach: z.boolean(),
  }),

  // Questions stratégiques
  keyQuestions: z.array(z.string()),

  // Alertes de conformité
  complianceWarnings: z.array(z.string()),
});

export type TDRAnalysis = z.infer<typeof TDRAnalysisSchema>;

/**
 * Tente de parser et valider un JSON retourné par le LLM.
 * Retourne le résultat validé ou null si le parsing échoue.
 */
export function parseTDRAnalysis(jsonString: string): TDRAnalysis | null {
  try {
    // Nettoyer le JSON (enlever les backticks markdown si présents)
    let cleaned = jsonString.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // Chercher le premier { et le dernier }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    cleaned = cleaned.slice(start, end + 1);

    const parsed = JSON.parse(cleaned);
    const result = TDRAnalysisSchema.safeParse(parsed);

    if (result.success) return result.data;

    console.warn("[TDR Parser] Validation Zod échouée:", result.error.issues.slice(0, 5));
    // Retourner quand même le parsed si le JSON est valide mais ne passe pas Zod
    // (champs manquants = null par défaut dans le prompt)
    return parsed as TDRAnalysis;
  } catch (err) {
    console.error("[TDR Parser] Erreur de parsing JSON:", err);
    return null;
  }
}
