/**
 * Pipeline de validation des projets.
 *
 * Pipeline avancé : BROUILLON → REDACTION → RELECTURE → VALIDATION
 *                 → FINALISATION → SOUMIS → ACCEPTE/REJETE
 *
 * Définit les transitions valides et leurs préconditions.
 */

import type { ProjetStatut, DocumentStatut } from "@/app/generated/prisma/client";

export const WORKFLOW_ORDER: ProjetStatut[] = [
  "BROUILLON",
  "REDACTION",
  "RELECTURE",
  "VALIDATION",
  "FINALISATION",
  "SOUMIS",
  "ACCEPTE",
  "REJETE",
];

export const WORKFLOW_LABELS: Record<ProjetStatut, string> = {
  BROUILLON: "Brouillon",
  REDACTION: "Rédaction",
  RELECTURE: "Relecture",
  VALIDATION: "Validation",
  FINALISATION: "Finalisation",
  SOUMIS: "Soumis",
  ACCEPTE: "Accepté",
  REJETE: "Rejeté",
  // Legacy
  EN_COURS: "En cours (legacy)",
  EN_REVISION: "En révision (legacy)",
  ARCHIVE: "Archivé",
};

// Transitions autorisées (statut courant → statuts atteignables)
export const VALID_TRANSITIONS: Record<ProjetStatut, ProjetStatut[]> = {
  BROUILLON: ["REDACTION"],
  REDACTION: ["RELECTURE", "BROUILLON"],
  RELECTURE: ["VALIDATION", "REDACTION"],
  VALIDATION: ["FINALISATION", "RELECTURE"],
  FINALISATION: ["SOUMIS", "VALIDATION"],
  SOUMIS: ["ACCEPTE", "REJETE"],
  ACCEPTE: [],
  REJETE: ["BROUILLON"],
  // Legacy : on autorise la migration vers le nouveau pipeline
  EN_COURS: ["REDACTION", "BROUILLON"],
  EN_REVISION: ["RELECTURE", "REDACTION"],
  ARCHIVE: [],
};

// Contexte minimal pour évaluer les conditions de transition
export interface TransitionContext {
  documents: { statut: DocumentStatut }[];
}

interface TransitionResult {
  ok: boolean;
  reason?: string;
}

/**
 * Vérifie si la transition `from → to` est autorisée et que les
 * préconditions du projet sont remplies.
 */
export function canTransition(
  from: ProjetStatut,
  to: ProjetStatut,
  ctx: TransitionContext,
): TransitionResult {
  if (from === to) return { ok: false, reason: "Le projet est déjà dans ce statut." };

  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Transition non autorisée : ${from} → ${to}.` };
  }

  // Préconditions par statut cible
  switch (to) {
    case "RELECTURE": {
      // Tous les documents doivent au minimum avoir quitté le BROUILLON
      if (ctx.documents.length === 0) {
        return { ok: false, reason: "Aucun document à relire — créez les livrables d'abord." };
      }
      const draftCount = ctx.documents.filter(d => d.statut === "BROUILLON").length;
      if (draftCount > 0) {
        return { ok: false, reason: `${draftCount} document(s) encore en brouillon.` };
      }
      return { ok: true };
    }
    case "VALIDATION": {
      // Aucun document ne doit être en simple rédaction
      const blockers = ctx.documents.filter(d =>
        d.statut === "BROUILLON" || d.statut === "REDACTION"
      ).length;
      if (blockers > 0) {
        return { ok: false, reason: `${blockers} document(s) pas encore en relecture.` };
      }
      return { ok: true };
    }
    case "FINALISATION": {
      // Tous les documents doivent être validés ou en finalisation
      const blockers = ctx.documents.filter(d =>
        d.statut !== "VALIDE" && d.statut !== "FINALISATION" && d.statut !== "VALIDATION"
      ).length;
      if (blockers > 0) {
        return { ok: false, reason: `${blockers} document(s) non validé(s).` };
      }
      return { ok: true };
    }
    case "SOUMIS": {
      const blockers = ctx.documents.filter(d => d.statut !== "VALIDE").length;
      if (blockers > 0) {
        return { ok: false, reason: `${blockers} document(s) non finalisé(s) — tous doivent être à VALIDE.` };
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}

/** Liste les statuts atteignables depuis `from` (sans vérifier les préconditions). */
export function getValidTransitions(from: ProjetStatut): ProjetStatut[] {
  return VALID_TRANSITIONS[from] ?? [];
}
