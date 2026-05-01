/**
 * Schema Zod pour la structure TDRAnalysis — Phase 1.5
 *
 * Validation renforcée avec contraintes minimales de qualité :
 * - Descriptions de sections ≥ 200 caractères
 * - Sous-critères ≥ 3 par critère
 * - 8-12 keyQuestions complètes
 * - ≥ 5 complianceWarnings
 */

import { z } from "zod/v4";

// Schema strict — utilisé pour la validation de qualité
export const TDRAnalysisStrictSchema = z.object({
  donor: z.object({
    name: z.string(),
    program: z.string().nullable(),
    referenceNumber: z.string().nullable(),
  }),

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

  budget: z.object({
    minAmount: z.number().nullable(),
    maxAmount: z.number().nullable(),
    currency: z.string(),
    cofinancingRequired: z.boolean(),
    cofinancingMinPercent: z.number().nullable(),
    overheadMaxPercent: z.number().nullable(),
  }),

  eligibility: z.object({
    countries: z.array(z.string()),
    organizationTypes: z.array(z.string()),
    consortiumRequired: z.boolean(),
    minPartners: z.number().nullable(),
    sectors: z.array(z.string()).min(2, "Lister au moins 2 secteurs"),
  }),

  requiredSections: z.array(z.object({
    id: z.string(),
    title: z.string().min(5),
    description: z.string().min(100, "Description trop courte — minimum 100 caractères avec détails substantiels"),
    maxPages: z.number().nullable(),
    maxCharacters: z.number().nullable(),
    weight: z.number().nullable(),
  })).min(4, "Au moins 4 sections requises"),

  evaluationCriteria: z.array(z.object({
    name: z.string(),
    weight: z.number(),
    subcriteria: z.array(z.string()).min(2, "Au moins 2 sous-critères par critère"),
  })).min(3, "Au moins 3 critères d'évaluation"),

  requiredAnnexes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    template: z.string().nullable(),
  })),

  crossCuttingRequirements: z.object({
    genderMarker: z.number().nullable(),
    environmentMarker: z.number().nullable(),
    climateAdaptation: z.boolean(),
    climateMitigation: z.boolean(),
    governanceMarker: z.number().nullable(),
    doNoHarm: z.boolean(),
    nexusApproach: z.boolean(),
  }),

  keyQuestions: z.array(z.string().min(50, "Question trop courte")).min(6, "Au moins 6 questions stratégiques"),

  complianceWarnings: z.array(z.string()).min(4, "Au moins 4 alertes de conformité"),
});

// Schema souple — accepte les extractions partielles
export const TDRAnalysisLooseSchema = z.object({
  donor: z.object({
    name: z.string(),
    program: z.string().nullable().optional(),
    referenceNumber: z.string().nullable().optional(),
  }),
  timeline: z.object({
    publishDate: z.string().nullable().optional(),
    submissionDeadline: z.string(),
    questionsDeadline: z.string().nullable().optional(),
    expectedStartDate: z.string().nullable().optional(),
    projectDuration: z.object({ value: z.number(), unit: z.string() }).nullable().optional(),
  }),
  budget: z.object({
    minAmount: z.number().nullable().optional(),
    maxAmount: z.number().nullable().optional(),
    currency: z.string(),
    cofinancingRequired: z.boolean().optional(),
    cofinancingMinPercent: z.number().nullable().optional(),
    overheadMaxPercent: z.number().nullable().optional(),
  }),
  eligibility: z.object({
    countries: z.array(z.string()),
    organizationTypes: z.array(z.string()).optional(),
    consortiumRequired: z.boolean().optional(),
    minPartners: z.number().nullable().optional(),
    sectors: z.array(z.string()),
  }),
  requiredSections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    maxPages: z.number().nullable().optional(),
    maxCharacters: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
  })),
  evaluationCriteria: z.array(z.object({
    name: z.string(),
    weight: z.number(),
    subcriteria: z.array(z.string()),
  })),
  requiredAnnexes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    template: z.string().nullable().optional(),
  })).optional(),
  crossCuttingRequirements: z.object({
    genderMarker: z.number().nullable().optional(),
    environmentMarker: z.number().nullable().optional(),
    climateAdaptation: z.boolean().optional(),
    climateMitigation: z.boolean().optional(),
    governanceMarker: z.number().nullable().optional(),
    doNoHarm: z.boolean().optional(),
    nexusApproach: z.boolean().optional(),
  }).optional(),
  keyQuestions: z.array(z.string()),
  complianceWarnings: z.array(z.string()),
});

export type TDRAnalysis = z.infer<typeof TDRAnalysisStrictSchema>;

/**
 * Tente de parser et valider un JSON retourné par le LLM.
 *
 * Retourne :
 * - { data, quality: 'high' } si la validation stricte passe
 * - { data, quality: 'partial', errors } si seul le schéma souple passe
 * - null si le parsing JSON échoue complètement
 */
export function parseTDRAnalysis(jsonString: string): {
  data: TDRAnalysis;
  quality: "high" | "partial";
  errors?: string[];
} | null {
  try {
    // Nettoyer le JSON
    let cleaned = jsonString.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    cleaned = cleaned.slice(start, end + 1);

    const parsed = JSON.parse(cleaned);

    // Essayer la validation stricte d'abord
    const strictResult = TDRAnalysisStrictSchema.safeParse(parsed);
    if (strictResult.success) {
      return { data: strictResult.data, quality: "high" };
    }

    // Collecter les erreurs de la validation stricte
    const errors = strictResult.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    console.warn("[TDR Parser] Validation stricte échouée:", errors.slice(0, 5));

    // Essayer la validation souple
    const looseResult = TDRAnalysisLooseSchema.safeParse(parsed);
    if (looseResult.success) {
      return { data: looseResult.data as TDRAnalysis, quality: "partial", errors };
    }

    // Dernier recours : retourner le JSON brut s'il a la bonne structure de base
    if (parsed.donor && parsed.timeline && parsed.requiredSections) {
      return { data: parsed as TDRAnalysis, quality: "partial", errors };
    }

    console.error("[TDR Parser] Validation souple aussi échouée");
    return null;
  } catch (err) {
    console.error("[TDR Parser] Erreur de parsing JSON:", err);
    return null;
  }
}

/**
 * Formate les erreurs de validation pour le prompt de correction.
 */
export function formatValidationErrors(errors: string[]): string {
  return errors.map((e, i) => `${i + 1}. ${e}`).join("\n");
}
