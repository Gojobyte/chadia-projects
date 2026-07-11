// Helpers de scoring partagés entre page.tsx (calcul initial) et
// ScoreDetailModal (détail + suggestions d'actions).
// Avant le Sprint 3, ces fonctions étaient dupliquées et avaient déjà
// commencé à diverger (cf audit P1-3). Centralisées ici.

export type PieceCategorie = "A" | "B" | "C" | "D" | "E";
export type PieceStatus = "ok" | "draft" | "ai" | "miss";

// Type permissif : on a juste besoin de status pour le calcul. Toute interface
// qui expose un champ status compatible peut être passée (cf WorkspacePiece).
interface PieceForScoring {
  status: PieceStatus | string;
}

/**
 * À partir du label d'un critère d'évaluation extrait par Mistral,
 * détermine quelles catégories de pièces (A-E) y contribuent.
 *
 * - "Capacité opérationnelle / expérience" → B (techniques), E (administratives)
 * - "Pertinence / cohérence / stratégie" → C (techniques narratives)
 * - "Méthodologie / approche / faisabilité / M&E" → C
 * - "Budget / coût / financier" → D
 * - "Durabilité / appropriation / pérennité" → C, E
 * - "Genre / inclusion / vulnérabilité" → C
 * - "Admin / conformité / éligibilité" → A
 * - fallback : toutes les catégories
 */
export function deduireCategoriesPourCritere(label: string): PieceCategorie[] {
  const l = label.toLowerCase();
  if (/capacit[ée] op[ée]rationnelle|exp[ée]rience|capacit[ée] technique|institut/.test(l)) return ["B", "E"];
  if (/pertinence|coh[ée]rence|alignement|strat[ée]gique/.test(l)) return ["C"];
  if (/m[ée]thodologie|approche|faisabilit[ée]|monitoring|m\s*&\s*e/.test(l)) return ["C"];
  if (/budget|co[ûu]t|financier|tr[ée]sorerie/.test(l)) return ["D"];
  if (/durabilit[ée]|appropriation|sortie|p[ée]rennit[ée]/.test(l)) return ["C", "E"];
  if (/genre|inclusion|vulnerab|protection/.test(l)) return ["C"];
  if (/admin|conformit[ée]|[ée]ligibilit/.test(l)) return ["A"];
  return ["A", "B", "C", "D", "E"];
}

/**
 * Calcule le % d'avancement d'un sous-ensemble de pièces.
 * Une pièce "ok" compte 1, "draft" 0.5, "ai" 0.3, "miss" 0.
 * Retourne un entier 0-100.
 *
 * Générique pour accepter n'importe quel type qui a un champ `status` —
 * évite les frictions avec Array<T> non-covariant côté TS.
 */
export function pctAvancement<T extends PieceForScoring>(piecesSubset: T[]): number {
  if (piecesSubset.length === 0) return 0;
  const score = piecesSubset.reduce((s, p) => {
    if (p.status === "ok") return s + 1;
    if (p.status === "draft") return s + 0.5;
    if (p.status === "ai") return s + 0.3;
    return s;
  }, 0);
  return Math.round((score / piecesSubset.length) * 100);
}
