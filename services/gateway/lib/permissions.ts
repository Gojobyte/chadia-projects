// ============================================================
// Permissions et rôles
// Centralise la logique d'autorisation pour éviter les magic strings
// "ADMIN"/"DIRECTEUR"/... dispersées dans 30+ endroits.
//
// Convention :
// - ADMIN     : superuser plateforme (rare, 1-2 personnes)
// - DIRECTEUR : direction de l'ONG, peut tout faire métier
// - FINANCIER : valide les budgets et candidatures
// - MEMBRE    : contributeur opérationnel (lecture + rédaction sections)
// ============================================================

export type UserRole = "ADMIN" | "DIRECTEUR" | "FINANCIER" | "MEMBRE";

export const ROLES = {
  ADMIN: "ADMIN" as const,
  DIRECTEUR: "DIRECTEUR" as const,
  FINANCIER: "FINANCIER" as const,
  MEMBRE: "MEMBRE" as const,
};

/** Vérifie qu'un rôle est dans une liste autorisée. Utilisé partout pour
 *  les checks de permission sur les Server Actions et UI conditionnelles. */
export function hasRole(role: string | undefined | null, ...allowed: UserRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role as UserRole);
}

// ============ Candidatures ============

/** Peut modifier le contenu d'une candidature (sections narratives, budget,
 *  équipe, pièces). Les MEMBRE sont en lecture seule pour V1. */
export function canEditCandidature(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR", "FINANCIER");
}

/** Peut créer une candidature depuis une opportunité. */
export function canCreateCandidature(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR", "FINANCIER");
}

/** Peut supprimer définitivement une candidature (action destructive). */
export function canDeleteCandidature(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR");
}

/** Peut faire avancer le workflow (BROUILLON → EN_REDACTION → ...). */
export function canTransitionCandidature(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR", "FINANCIER");
}

/** Peut lancer une analyse Mistral (coût API). */
export function canAnalyzeOpportunite(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR", "FINANCIER");
}

// ============ Utilisateurs ============

/** Peut inviter/modifier un utilisateur. */
export function canManageUsers(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR");
}

/** Peut supprimer (désactiver) un utilisateur. */
export function canDeleteUser(role: string | undefined | null): boolean {
  return hasRole(role, "DIRECTEUR");
}

// ============ Projets ============

export function canEditProjet(role: string | undefined | null): boolean {
  return hasRole(role, "ADMIN", "DIRECTEUR");
}

export function canDeleteProjet(role: string | undefined | null): boolean {
  return hasRole(role, "DIRECTEUR");
}
