// Types partagés de la page détail candidature.
// Extraits depuis page.tsx au Sprint 3 pour permettre la réutilisation
// dans les sous-composants (AOSummaryCard, BudgetEnveloppeCard, etc.)
// sans dépendance circulaire.

import type { QAItem } from "./QAPanel";

export interface Bailleur {
  id: string;
  nom: string;
  sigle: string;
  siteWeb?: string | null;
}

export interface AnalysisPiece {
  id: string;
  nom: string;
  description?: string | null;
  categorie?: "A" | "B" | "C" | "D" | "E";
  type?: "ADMIN" | "TECHNIQUE" | "FINANCIER" | "ANNEXE" | string;
  obligatoire?: boolean;
  format?: "PDF" | "DOCX" | "XLSX" | "LIBRE" | string;
}

export interface AnalysisCritere {
  label: string;
  description?: string;
  ponderation?: number | null;
}

export interface AnalysisEligibilite {
  label: string;
  description?: string;
  obligatoire?: boolean;
}

export interface Analysis {
  piecesRequises: AnalysisPiece[];
  criteres: (string | AnalysisCritere)[];
  eligibilite?: AnalysisEligibilite[];
  echeances: Array<{ label: string; date?: string | null }>;
  axesStrategiques: string[];
  indicateurs: string[];
  resume?: string | null;
  _meta?: { model?: string; analyzedAt?: string; usage?: unknown };
}

export interface Opportunite {
  id: string;
  titre: string;
  sourceConnector: string;
  sourceUrl?: string | null;
  dateLimiteDepot?: string | null;
  bailleur?: Bailleur | null;
  bailleurNom?: string | null;
  paysCible?: string[];
  region?: string | null;
  montantEstime?: number | null;
  devise?: string | null;
  typeFinancement?: string | null;
  rawPayload?: { _chadia?: { analysis?: Analysis | null } } | null;
}

export interface Doc {
  id: string;
  nom: string;
  originalName?: string | null;
  type: string;
  category: string;
  visibility: "PUBLIC" | "INTERNE" | "CONFIDENTIEL";
  mimeType?: string | null;
  taille?: number | null;
  url: string;
  version?: string | null;
  tags: string[];
  isPinned: boolean;
  description?: string | null;
  /** FK directe vers une pièce de l'arborescence (P0-3 fix). Si null, on
   *  fallback sur le matching par tags (rétrocompat). */
  pieceId?: string | null;
  createdAt: string;
  uploadedBy?: string | null;
}

export type Statut =
  | "BROUILLON"
  | "EN_REDACTION"
  | "EN_VALIDATION"
  | "SOUMISE"
  | "ATTRIBUEE"
  | "NON_RETENUE"
  | "ABANDONNEE";

export interface Candidature {
  id: string;
  reference: string;
  titre: string;
  description?: string | null;
  statut: Statut;
  coordinateurId?: string | null;
  equipe: string[];
  noteConcept?: string | null;
  methodologie?: string | null;
  partenaires: string[];
  budgetDemande?: number | null;
  coFinancement?: number | null;
  devise: string;
  dureeMois?: number | null;
  dateDepotPrevu?: string | null;
  dateDepotEffectif?: string | null;
  dateResultat?: string | null;
  commentairesBailleur?: string | null;
  opportunite?: Opportunite | null;
  documents?: Doc[];
  piecesOverrides?: {
    added?: AnalysisPiece[];
    updated?: Record<string, Partial<AnalysisPiece>>;
    removed?: string[];
  } | null;
  pieceContents?: Record<string, { html: string; updatedAt: string; savedBy?: string }> | null;
  qaThread?: QAItem[] | null;
  createdAt: string;
  updatedAt: string;
}

export const STATUT_LABEL: Record<Statut, string> = {
  BROUILLON: "Brouillon",
  EN_REDACTION: "En rédaction",
  EN_VALIDATION: "En validation",
  SOUMISE: "Soumise",
  ATTRIBUEE: "Attribuée",
  NON_RETENUE: "Non retenue",
  ABANDONNEE: "Abandonnée",
};

/** Formatte une date ISO en français long ("12 mai 2026"). */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Seuils sémantiques pour distinguer le niveau de complétion d'un contenu.
 * - Sous IA_THRESHOLD : "brouillon IA" (probable génération non révisée)
 * - Au-dessus de DRAFT_THRESHOLD : vrai brouillon humain
 * - Entre les deux : "draft" par défaut.
 * Valeurs en CARACTÈRES de HTML. Une section UE PRAG fait 2500-4500 chars.
 */
export const CONTENT_AI_THRESHOLD = 80;
export const CONTENT_DRAFT_THRESHOLD = 600;
