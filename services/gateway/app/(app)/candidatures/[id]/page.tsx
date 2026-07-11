import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DocsWorkspace, type Piece as WorkspacePiece } from "./DocsWorkspace";
import { DeleteCandidatureButton } from "./DeleteCandidatureButton";
import { ScoreDetailModal } from "./ScoreDetailModal";
import { MilestonesTimeline, type Milestone } from "./MilestonesTimeline";
import { StatutHistorique, type HistoryEvent } from "./StatutHistorique";
import { SelectiveExportModal } from "./SelectiveExportModal";
import { WorkflowStepper } from "./WorkflowStepper";
import { EligibiliteCheck } from "./EligibiliteCheck";
import { QAPanel, type QAItem } from "./QAPanel";
import { deduireCategoriesPourCritere, pctAvancement } from "./scoring-utils";
import type { OrgProfile } from "../../organisation/page";
import { SubmitButton } from "@/components/SubmitButton";
import { getAuthToken } from "@/lib/session-helpers";
import "./builder.css";

import type {
  Bailleur,
  AnalysisPiece,
  AnalysisCritere,
  AnalysisEligibilite,
  Analysis,
  Opportunite,
  Doc,
  Statut,
  Candidature,
} from "./types";
import {
  STATUT_LABEL,
  fmtDate,
  CONTENT_AI_THRESHOLD,
  CONTENT_DRAFT_THRESHOLD,
} from "./types";

// ---------------------------------------------------------------------
// Server Actions (inchangés vs. version précédente)
// ---------------------------------------------------------------------
async function patchAction(id: string, formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  // P0 sécurité : seuls les rôles éditeurs peuvent modifier les sections.
  // Sans ce check, un MEMBRE pouvait modifier titre, budget, équipe, etc.
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    throw new Error("Vous n'avez pas le droit de modifier cette candidature.");
  }
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  const body: Record<string, unknown> = {};
  const fields = ["titre", "description", "noteConcept", "methodologie", "commentairesBailleur", "coordinateurId"];
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null) body[f] = String(v).trim() || null;
  }
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };
  if (formData.has("budgetDemande")) body.budgetDemande = num("budgetDemande");
  if (formData.has("coFinancement")) body.coFinancement = num("coFinancement");
  if (formData.has("dureeMois")) body.dureeMois = num("dureeMois");
  if (formData.has("devise")) body.devise = String(formData.get("devise") ?? "EUR");
  if (formData.has("dateDepotPrevu")) {
    const v = String(formData.get("dateDepotPrevu") ?? "").trim();
    body.dateDepotPrevu = v ? new Date(v).toISOString() : null;
  }
  if (formData.has("equipeRaw")) {
    body.equipe = String(formData.get("equipeRaw") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (formData.has("partenairesRaw")) {
    body.partenaires = String(formData.get("partenairesRaw") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  }

  await TenderAPI.patchCandidature(id, body, token);
  revalidatePath(`/candidatures/${id}`);
  revalidatePath("/candidatures");
}

// Déclenche l'analyse Mistral de l'opportunité liée à cette candidature.
// Si l'opportunité a déjà été analysée, on retourne le cache sauf si on
// passe force=true (utile pour relancer après modification de l'AO).
// Retourne void (signature attendue par <form action>). Les erreurs sont
// loggées côté serveur — l'utilisateur les détecte via l'absence de
// mise à jour de la bannière scan IA.
async function analyzeAction(
  opportuniteId: string,
  candidatureId: string,
  force: boolean,
): Promise<void> {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    throw new Error("Vous n'avez pas le droit de lancer l'analyse IA.");
  }
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  try {
    await TenderAPI.analyzeOpportunite(opportuniteId, token, force);
  } catch (e) {
    // Mistral peut être en down (503), quota dépassé, JSON invalide…
    // On log et on laisse remonter pour que Next affiche un toast d'erreur
    // via le mécanisme d'error boundary par défaut.
    console.error("[analyzeAction] Mistral a échoué :", e);
    throw new Error("L'analyse Mistral a échoué. Réessayez dans une minute.");
  }

  // Revalide la page courante pour que l'analyse fraîche soit visible
  // immédiatement (P1-15 fix).
  revalidatePath(`/candidatures/${candidatureId}`);
  revalidatePath(`/candidatures`);
  revalidatePath(`/opportunites/${opportuniteId}`);
}

// Server Actions pour la gestion des pièces du dossier.
// ADMIN/DIRECTEUR/FINANCIER peuvent ajouter, modifier ou retirer une pièce
// requise — cela ne touche pas à l'analyse Mistral partagée mais s'enregistre
// dans Candidature.piecesOverrides.
async function piecesAddAction(
  candidatureId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    return { ok: false, error: "Vous n'avez pas le droit de modifier les pièces" };
  }
  const token = getAuthToken(session);
  if (!token) return { ok: false, error: "Token manquant" };

  const piece = {
    nom: String(formData.get("nom") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    categorie: String(formData.get("categorie") || "E"),
    type: String(formData.get("type") || "ANNEXE"),
    obligatoire: formData.get("obligatoire") === "on",
    format: String(formData.get("format") || "DOCX"),
  };
  if (!piece.nom) return { ok: false, error: "Le nom de la pièce est obligatoire" };

  try {
    await TenderAPI.patchCandidaturePieces(candidatureId, { action: "add", piece }, token);
    revalidatePath(`/candidatures/${candidatureId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'ajout" };
  }
}

async function piecesUpdateAction(
  candidatureId: string,
  pieceId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    return { ok: false, error: "Vous n'avez pas le droit de modifier les pièces" };
  }
  const token = getAuthToken(session);
  if (!token) return { ok: false, error: "Token manquant" };

  const patch: Record<string, unknown> = {};
  if (formData.has("nom")) patch.nom = String(formData.get("nom") || "").trim();
  if (formData.has("description")) patch.description = String(formData.get("description") || "").trim() || null;
  if (formData.has("categorie")) patch.categorie = String(formData.get("categorie") || "E");
  if (formData.has("type")) patch.type = String(formData.get("type") || "ANNEXE");
  if (formData.has("format")) patch.format = String(formData.get("format") || "DOCX");
  if (formData.has("obligatoire")) patch.obligatoire = formData.get("obligatoire") === "on";

  try {
    await TenderAPI.patchCandidaturePieces(candidatureId, { action: "update", id: pieceId, patch }, token);
    revalidatePath(`/candidatures/${candidatureId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de modification" };
  }
}

// Autosave du contenu d'UNE pièce de l'arborescence.
// L'appel est debouncé côté client (useAutosave 1.5s), mais cette action
// est aussi déclenchée au "flush" (changement de pièce ou démontage), donc
// elle doit être idempotente et rapide.
async function savePieceContentAction(
  candidatureId: string,
  pieceId: string,
  html: string,
): Promise<{ ok: boolean; error?: string; savedAt?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    return { ok: false, error: "Vous n'avez pas le droit de modifier le contenu" };
  }
  const token = getAuthToken(session);
  if (!token) return { ok: false, error: "Token manquant" };

  try {
    const result = await TenderAPI.savePieceContent(candidatureId, pieceId, html, token);
    // PAS de revalidatePath ici — sinon chaque frappe re-render toute la
    // page (toolbar, tree, panel IA…) et l'autosave devient inutilisable.
    // La revalidation se fera au prochain F5 ou navigation.
    return { ok: true, savedAt: result.savedAt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de sauvegarde" };
  }
}

async function piecesRemoveAction(
  candidatureId: string,
  pieceId: string,
): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    return { ok: false, error: "Vous n'avez pas le droit de modifier les pièces" };
  }
  const token = getAuthToken(session);
  if (!token) return { ok: false, error: "Token manquant" };

  try {
    await TenderAPI.patchCandidaturePieces(candidatureId, { action: "remove", id: pieceId }, token);
    revalidatePath(`/candidatures/${candidatureId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de suppression" };
  }
}

// Suppression définitive de la candidature (ADMIN/DIRECTEUR uniquement).
// Les documents liés sont supprimés en cascade (Document.candidatureId
// avec onDelete:Cascade dans le schéma Prisma).
async function deleteCandidatureAction(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR") {
    throw new Error("Seuls l'admin et le directeur peuvent supprimer une candidature.");
  }
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  await TenderAPI.deleteCandidature(id, token);
  revalidatePath("/candidatures");
  redirect("/candidatures");
}

// Sauvegarde du thread Q&A (V15 / P2-35). On passe le thread complet plutôt
// qu'un diff pour rester simple : la liste est petite (qq dizaines de Q max)
// et la concurrence d'écriture multi-utilisateur est très faible pour ce
// type de contenu (le coordinateur ou directeur l'édite seul en général).
async function saveQaThreadAction(id: string, thread: QAItem[]) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    throw new Error("Vous n'avez pas le droit de modifier les Q&A.");
  }
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  await TenderAPI.patchCandidature(id, { qaThread: thread }, token);
  revalidatePath(`/candidatures/${id}`);
}

async function transitionAction(id: string, newStatut: Statut) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR" && role !== "FINANCIER") {
    throw new Error("Vous n'avez pas le droit de faire avancer le dossier.");
  }
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  const patch: Record<string, unknown> = { statut: newStatut };
  if (newStatut === "SOUMISE") patch.dateDepotEffectif = new Date().toISOString();
  if (newStatut === "ATTRIBUEE" || newStatut === "NON_RETENUE") patch.dateResultat = new Date().toISOString();

  await TenderAPI.patchCandidature(id, patch, token);
  revalidatePath(`/candidatures/${id}`);
  revalidatePath("/candidatures");
}

// ---------------------------------------------------------------------
// Helpers v2 — conversion Analysis → Piece[]
// ---------------------------------------------------------------------

/** Templates de fallback quand l'IA n'a pas encore analysé l'AO. Pour avoir
 *  quand même un workspace utilisable, on génère une checklist générique
 *  basée sur le PRAG UE (le standard le plus exigeant). */
const FALLBACK_PIECES: AnalysisPiece[] = [
  { id: "recepisse", nom: "Récépissé d'enregistrement ONG", description: "Statuts & juridique CHADIA", categorie: "A", type: "ADMIN", obligatoire: true, format: "PDF" },
  { id: "statuts", nom: "Statuts CHADIA tamponnés", description: "Validés conseil 14 fév. 2026", categorie: "A", type: "ADMIN", obligatoire: true, format: "PDF" },
  { id: "fiscal", nom: "Attestation fiscale DGI Tchad", description: "Mise à jour annuelle", categorie: "A", type: "ADMIN", obligatoire: true, format: "PDF" },
  { id: "rib", nom: "RIB & attestation bancaire", description: "Compte projet de la candidature", categorie: "A", type: "ADMIN", obligatoire: true, format: "PDF" },
  { id: "probite", nom: "Déclaration probité", description: "À signer par la directrice avant dépôt", categorie: "A", type: "ADMIN", obligatoire: true, format: "DOCX" },
  { id: "references", nom: "Tableau références similaires", description: "Projets antérieurs dans le secteur/zone", categorie: "B", type: "TECHNIQUE", obligatoire: true, format: "XLSX" },
  { id: "presentation", nom: "Note présentation institutionnelle", description: "Mission, gouvernance, équipe permanente", categorie: "B", type: "TECHNIQUE", obligatoire: true, format: "DOCX" },
  { id: "bilans", nom: "Bilans financiers 2024 & 2025", description: "Comptes annuels certifiés", categorie: "B", type: "TECHNIQUE", obligatoire: true, format: "PDF" },
  { id: "note-methodologique", nom: "Note méthodologique principale", description: "Contexte, approche, calendrier", categorie: "C", type: "TECHNIQUE", obligatoire: true, format: "DOCX" },
  { id: "cadre-logique", nom: "Cadre logique & indicateurs", description: "Logframe + matrice SMART", categorie: "C", type: "TECHNIQUE", obligatoire: true, format: "XLSX" },
  { id: "plan-me", nom: "Plan de monitoring & évaluation", description: "M&E plan + livrables", categorie: "C", type: "TECHNIQUE", obligatoire: true, format: "DOCX" },
  { id: "budget", nom: "Budget détaillé · trame PRAG", description: "Ventilation par poste + coûts indirects", categorie: "D", type: "FINANCIER", obligatoire: true, format: "XLSX" },
  { id: "tresorerie", nom: "Plan trésorerie · décaissements", description: "Calendrier de financement par tranches", categorie: "D", type: "FINANCIER", obligatoire: true, format: "XLSX" },
  { id: "justif-couts", nom: "Note justification coûts", description: "Méthode de calcul et hypothèses", categorie: "D", type: "FINANCIER", obligatoire: true, format: "DOCX" },
  { id: "cv-chef", nom: "CV chef de mission", description: "Profil + expériences clés", categorie: "E", type: "ANNEXE", obligatoire: true, format: "PDF" },
  { id: "cv-coord", nom: "CV coordinateur opérations", description: "Profil opérationnel terrain", categorie: "E", type: "ANNEXE", obligatoire: true, format: "PDF" },
  { id: "cv-genre", nom: "CV référent·e genre", description: "Profil avec certification VBG", categorie: "E", type: "ANNEXE", obligatoire: true, format: "PDF" },
  { id: "lettres", nom: "Lettres d'engagement partenaires", description: "OSC locales, autorités coutumières", categorie: "E", type: "ANNEXE", obligatoire: false, format: "DOCX" },
];

type PieceCategorie = "A" | "B" | "C" | "D" | "E";

/** Convertit les pièces analysées par Mistral en pièces consommables par le
 *  composant DocsWorkspace, avec calcul du statut (ok / draft / miss / ai)
 *  à partir des documents joints à la candidature.
 *
 *  Applique aussi les overrides locaux de la candidature :
 *  - cand.piecesOverrides.removed : pièces filtrées
 *  - cand.piecesOverrides.updated : patches appliqués
 *  - cand.piecesOverrides.added   : pièces ajoutées en queue
 */
function buildPieces(cand: Candidature, analysis: Analysis | null): WorkspacePiece[] {
  const baseSource = analysis?.piecesRequises?.length ? analysis.piecesRequises : FALLBACK_PIECES;
  const overrides = cand.piecesOverrides ?? { added: [], updated: {}, removed: [] };
  const removed = new Set(overrides.removed ?? []);
  const updated = overrides.updated ?? {};
  const added = overrides.added ?? [];

  // Fusion : filtre les supprimées, applique les patches, append les ajoutées
  const merged: AnalysisPiece[] = [
    ...baseSource
      .filter((p) => !removed.has(p.id))
      .map((p) => ({ ...p, ...(updated[p.id] || {}) } as AnalysisPiece)),
    ...added,
  ];

  const tags = new Set<string>((cand.documents ?? []).flatMap((d) => d.tags ?? []));
  // Matching pièce ↔ document : priorité à document.pieceId (FK directe,
  // P0-3 fix). Fallback : matching par tags pour rétrocompat avec les
  // docs téléversés avant l'introduction de pieceId.
  const docsByPieceId = new Map<string, Doc>();
  const docsByTag = new Map<string, Doc>();
  for (const d of cand.documents ?? []) {
    if (d.pieceId) docsByPieceId.set(d.pieceId, d);
    for (const t of d.tags ?? []) docsByTag.set(t, d);
  }

  // Contenus rédigés persistés (autosave côté client → endpoint pieces/:id/content)
  const pieceContents = cand.pieceContents ?? {};

  return merged.map((p) => {
    // Priorité 1 : matching par FK directe (le plus fiable)
    // Priorité 2 : matching par tag (rétrocompat avec docs antérieurs)
    const docMatch = docsByPieceId.get(p.id) ?? docsByTag.get(p.id) ?? docsByTag.get(p.nom);
    const isNoteMethodo = /m[ée]thodologi/i.test(p.nom) && p.categorie === "C";
    const isCadreLogique = /cadre\s*logique|logframe/i.test(p.nom);
    const isPresentation = /pr[ée]sentation institutionnelle/i.test(p.nom);

    let status: "ok" | "draft" | "miss" | "ai" = "miss";
    let contenu: string | null = null;
    let lastSavedAt: string | null = null;

    // PRIORITÉ 1 : contenu rédigé dans l'éditeur (cand.pieceContents)
    // C'est la nouvelle source unique pour le contenu rédigé inline.
    const savedContent = pieceContents[p.id];
    if (savedContent?.html) {
      contenu = savedContent.html;
      lastSavedAt = savedContent.updatedAt ?? null;
      // Statut : un contenu rédigé compte au moins comme brouillon (draft).
      status = savedContent.html.length > CONTENT_DRAFT_THRESHOLD ? "draft" : "ai";
    }

    // PRIORITÉ 2 : document téléversé matché par tag → pièce "validée"
    if (docMatch) {
      status = "ok";
    }

    // FALLBACK pour rétrocompat : mapper noteConcept / methodologie /
    // description sur les pièces de l'arborescence avant l'autosave.
    if (!contenu) {
      if (isNoteMethodo) {
        if (cand.noteConcept && cand.noteConcept.length > CONTENT_AI_THRESHOLD) {
          status = status === "ok" ? "ok" : "draft";
          contenu = cand.noteConcept;
        } else if (cand.noteConcept) {
          status = status === "ok" ? "ok" : "ai";
          contenu = cand.noteConcept;
        }
      } else if (isCadreLogique && cand.methodologie) {
        status = status === "ok" ? "ok" : "draft";
        contenu = cand.methodologie;
      } else if (isPresentation && cand.description) {
        status = status === "ok" ? "ok" : "draft";
        contenu = cand.description;
      }
    }

    return {
      id: p.id,
      nom: p.nom,
      description: p.description,
      categorie: (p.categorie as PieceCategorie) || "E",
      type: p.type,
      obligatoire: p.obligatoire,
      format: p.format,
      status,
      documentId: docMatch?.id ?? null,
      contenu,
      lastSavedAt,
    };
  });
}

function normalizeCriteres(criteres: (string | AnalysisCritere)[]): AnalysisCritere[] {
  return criteres.map((c, i) => {
    if (typeof c === "string") {
      return { label: c.split(" · ")[0] || `Critère ${i + 1}`, description: c, ponderation: null };
    }
    return {
      label: c.label || `Critère ${i + 1}`,
      description: c.description || "",
      ponderation: typeof c.ponderation === "number" ? c.ponderation : null,
    };
  });
}

// ---------------------------------------------------------------------
export default async function CandidatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  const { id } = await params;

  // P1 perf : on parallélise les 2 fetchs indépendants (candidature + profil
  // organisation, et la bibliothèque pour scanner les documents en preuve).
  // Promise.allSettled pour qu'un échec partiel ne bloque pas l'affichage
  // de la candidature (profil et docs sont optionnels).
  const [candResult, profileResult, libraryResult] = await Promise.allSettled([
    TenderAPI.getCandidature(id, token),
    TenderAPI.getSetting("org.profile", token),
    // Documents de la bibliothèque — sert au scan de preuves d'éligibilité.
    // On limite implicitement à ce que l'API retourne (default page size).
    TenderAPI.listDocuments({}, token),
  ]);

  let cand: Candidature | null = null;
  let errorMsg: string | null = null;
  if (candResult.status === "fulfilled") {
    cand = candResult.value.candidature ?? null;
  } else {
    errorMsg = candResult.reason instanceof Error
      ? candResult.reason.message
      : "Erreur de chargement";
  }

  // Profil organisation pour la comparaison d'éligibilité (V14 / P2-34).
  // Setting key="org.profile" — peut ne pas exister encore (404 silencieux).
  // L'API tender renvoie `{ setting: { value: {...} } }` — l'ancien code
  // lisait `res.value` au top-level et ratait toujours la donnée. Bug fix
  // miroir de celui de /organisation/page.tsx.
  let orgProfile: OrgProfile | null = null;
  if (profileResult.status === "fulfilled") {
    const r = profileResult.value as { setting?: { value?: unknown }; value?: unknown } | null;
    const raw = r?.setting?.value ?? r?.value;
    if (raw && typeof raw === "object") {
      orgProfile = raw as OrgProfile;
    }
  }
  // Si profileResult a échoué (404 par exemple), on laisse orgProfile=null
  // pour afficher le CTA dans EligibiliteCheck.

  // Documents de la bibliothèque — réduits aux champs utiles au scan.
  // EligibiliteCheck les utilise pour repérer les "preuves" qui attestent
  // qu'un critère est rempli (ex: critère "PEAS" → doc "Manuel PEAS" matche).
  interface LibraryDocLite {
    id: string;
    nom: string;
    description?: string | null;
    tags: string[];
    type: string;
    category: string;
    mimeType?: string | null;
  }
  let libraryDocs: LibraryDocLite[] = [];
  if (libraryResult.status === "fulfilled") {
    const allDocs = (libraryResult.value as { documents?: LibraryDocLite[] })?.documents ?? [];
    libraryDocs = allDocs;
  }

  if (errorMsg || !cand) {
    return (
      <div className="empty">
        <div className="ic">
          <i className="ph ph-warning-octagon" aria-hidden="true"></i>
        </div>
        <h3 className="t">
          Candidature <em>introuvable</em>
        </h3>
        <p className="s">{errorMsg ?? "Cet identifiant ne correspond à aucune candidature."}</p>
        <Link href="/candidatures" className="btn btn--secondary">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const canEdit =
    session.user.role === "ADMIN" || session.user.role === "DIRECTEUR" || session.user.role === "FINANCIER";
  const opp = cand.opportunite;
  const bailleurLabel = opp?.bailleur?.sigle ?? opp?.bailleurNom ?? "Bailleur non précisé";

  // Analyse Mistral si disponible (cache dans rawPayload._chadia.analysis).
  const analysis: Analysis | null = opp?.rawPayload?._chadia?.analysis ?? null;
  const hasAnalysis = !!analysis && Array.isArray(analysis.piecesRequises) && analysis.piecesRequises.length > 0;

  // Pièces du dossier — Mistral si disponible, sinon checklist PRAG générique.
  const pieces = buildPieces(cand, analysis);
  const piecesCompleted = pieces.filter((p) => p.status === "ok").length;
  const piecesScoreConformite = pieces.length === 0
    ? 0
    : Math.min(100, Math.round(((piecesCompleted + pieces.filter((p) => p.status === "draft").length * 0.5) / pieces.length) * 100));

  // Critères normalisés depuis l'analyse (compat v1 string-only et v2 objet).
  const criteres: AnalysisCritere[] = normalizeCriteres(analysis?.criteres ?? []);

  // Pour chaque critère, on calcule un score basé sur l'état des pièces de
  // ses catégories pertinentes — pas un score uniforme global. C'est l'audit
  // P1-13 corrigé : maintenant chaque barre reflète vraiment l'état du
  // chantier correspondant.
  const criteresPond = criteres.map((c) => {
    const ponderation = c.ponderation ?? Math.round(100 / Math.max(1, criteres.length));
    const cats = deduireCategoriesPourCritere(c.label);
    const piecesSubset = pieces.filter((p) => cats.includes(p.categorie));
    // Le type Piece de DocsWorkspace n'est pas strictement assignable à
    // PieceForScoring de scoring-utils (arrays non-covariants en TS) mais
    // est structurellement compatible — on caste pour faire taire le check.
    const pct = pctAvancement(piecesSubset as Array<{ status: string }>);
    const score = Math.round((pct / 100) * ponderation);
    return { ...c, ponderation, score, bar: pct };
  });
  const scoreIATotal = criteresPond.reduce((s, c) => s + c.score, 0);
  const scoreIAMax = criteresPond.reduce((s, c) => s + (c.ponderation ?? 0), 0) || 100;

  // ====== Jalons (P1-32) ======
  // Combine la deadline AO + les échéances extraites par Mistral.
  // Ordre : deadline d'abord car c'est le jalon le plus critique.
  const milestones: Milestone[] = [];
  if (opp?.dateLimiteDepot) {
    milestones.push({
      label: "Date limite de dépôt bailleur",
      date: opp.dateLimiteDepot,
      kind: "deadline",
    });
  }
  if (cand.dateDepotPrevu) {
    milestones.push({
      label: "Dépôt prévu CHADIA",
      date: cand.dateDepotPrevu,
      kind: "lifecycle",
    });
  }
  if (Array.isArray(analysis?.echeances)) {
    for (const e of analysis!.echeances) {
      milestones.push({ label: e.label, date: e.date ?? null, kind: "info" });
    }
  }

  // ====== Historique (P1-33) ======
  // V1 : on dérive les événements des champs de la candidature.
  // À terme, une vraie table AuditLog tracera qui a fait quoi quand.
  const history: HistoryEvent[] = [];
  history.push({
    label: "Candidature créée",
    detail: `Référence ${cand.reference}`,
    date: cand.createdAt,
    kind: "create",
  });
  if (cand.statut !== "BROUILLON" && cand.updatedAt !== cand.createdAt) {
    // Approximation : on suppose que le passage en EN_REDACTION s'est fait
    // entre createdAt et la première grosse modif (updatedAt si différent).
    if (cand.noteConcept || cand.methodologie) {
      history.push({
        label: "Rédaction démarrée",
        detail: "Première section narrative rédigée",
        date: cand.updatedAt,
        kind: "draft",
      });
    }
  }
  if (cand.dateDepotEffectif) {
    history.push({
      label: "Candidature soumise au bailleur",
      detail: `Dépôt effectif · ${bailleurLabel}`,
      date: cand.dateDepotEffectif,
      kind: "submit",
    });
  } else if (cand.dateDepotPrevu) {
    history.push({
      label: "Dépôt prévu",
      detail: "Échéance interne CHADIA",
      date: cand.dateDepotPrevu,
      kind: "submit",
    });
  }
  if (cand.dateResultat) {
    history.push({
      label:
        cand.statut === "ATTRIBUEE"
          ? "Candidature attribuée 🎉"
          : cand.statut === "NON_RETENUE"
          ? "Candidature non retenue"
          : "Résultat reçu",
      detail: cand.commentairesBailleur?.slice(0, 120) ?? null,
      date: cand.dateResultat,
      kind: cand.statut === "ATTRIBUEE" ? "awarded" : "rejected",
    });
  } else if (cand.statut === "SOUMISE") {
    history.push({
      label: "En attente du résultat",
      detail: "Le bailleur n'a pas encore communiqué sa décision",
      date: null,
      kind: "info",
    });
  }

  // Critères d'éligibilité — depuis Mistral ou fallback minimal.
  const eligibilite: AnalysisEligibilite[] = analysis?.eligibilite?.length
    ? analysis.eligibilite
    : [
        { label: "Personnalité juridique tchadienne · ONG enregistrée", description: "Récépissé 187/MAT/SG/DAPSAJ vérifié sur statuts", obligatoire: true },
        { label: "Expérience secteur ≥ 3 ans", description: "Références projets antérieurs requises", obligatoire: true },
        { label: "Cofinancement minimum 10 %", description: "Tour de table à confirmer auprès des cofinanceurs", obligatoire: true },
        { label: "Attestation fiscale à jour", description: "DGI Tchad · valable au moment du dépôt", obligatoire: true },
      ];

  const deadline = opp?.dateLimiteDepot ?? cand.dateDepotPrevu;
  const jUntil = (() => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 3600 * 1000));
  })();

  const opportuniteId = opp?.id;
  // Signature : (opportuniteId, candidatureId, force) → on bind les 2 premiers
  // pour ne plus avoir qu'à passer `force` côté form.
  const analyzeNow = opportuniteId ? analyzeAction.bind(null, opportuniteId, cand.id, false) : null;
  const reAnalyze = opportuniteId ? analyzeAction.bind(null, opportuniteId, cand.id, true) : null;

  // Suggestions IA prêtes à afficher dans le panel droit du workspace.
  const aiHints = [];
  if (analysis?.resume) {
    aiHints.push({
      title: "Synthèse Mistral",
      body: analysis.resume,
      primary: "Réutiliser dans 3.1",
      secondary: "Voir détail",
    });
  }
  if (analysis?.axesStrategiques?.length) {
    aiHints.push({
      title: "Axes stratégiques du bailleur",
      body: analysis.axesStrategiques.slice(0, 4).join(" · "),
      primary: "Insérer dans 3.2",
      secondary: "Modifier",
    });
  }
  if (!analysis) {
    aiHints.push({
      title: "Analyse non lancée",
      body: "Cliquez sur \"Lancer l'analyse\" en haut de la page pour que Mistral lise l'AO et alimente cet assistant.",
    });
  }

  return (
    <div className="pg">
      {/* ============ Page header ============ */}
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            <Link href="/candidatures" style={{ color: "var(--color-stone)", textDecoration: "none" }}>
              <i className="ph ph-arrow-left" aria-hidden="true"></i> Cycle de réponse
            </Link>
            {" · "}
            {hasAnalysis
              ? `${pieces.length} documents requis identifiés`
              : "Édition collaborative · analyse IA à lancer"}
          </div>
          <h1 className="pg-title">
            Montage de la <em>candidature.</em>
          </h1>
          <p className="pg-sub">
            {hasAnalysis
              ? `L'IA a analysé cet appel d'offres et extrait ${pieces.length} documents requis répartis en 5 catégories. Rédigez, modifiez et exportez chaque pièce depuis CHADIA.`
              : "Lancez l'analyse Mistral pour extraire automatiquement la liste des pièces et critères du bailleur."}
          </p>
        </div>
        <div className="pg-actions">
          <button type="button" className="btn btn--ghost btn--sm" disabled aria-disabled="true">
            <i className="ph ph-clock-counter-clockwise" aria-hidden="true"></i> Historique
          </button>
          <button type="button" className="btn btn--secondary btn--sm" disabled aria-disabled="true">
            <i className="ph ph-users-three" aria-hidden="true"></i> Inviter ({(cand.equipe?.length ?? 0)})
          </button>
          <a
            href={`/api/tender/candidatures/${cand.id}/export.zip`}
            className="btn btn--ghost btn--sm"
            title="Télécharger toutes les pièces en ZIP"
          >
            <i className="ph ph-package" aria-hidden="true"></i> Export ZIP
          </a>
          {/* Le bouton "Déposer la candidature" est uniquement disponible dans
              le footer workflow (en bas) pour éviter le doublon — un seul
              endroit pour la décision finale. */}
        </div>
      </header>

      {/* ============ AO summary ============ */}
      <section className="ao-summary">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <div className="ao-ref">
              {cand.reference}
              {opp?.sourceConnector ? <> · {opp.sourceConnector}</> : null}
              {opp?.region ? <> · {opp.region}</> : null}
            </div>
            <h2>{opp?.titre ?? cand.titre}</h2>
            <div className="ao-meta">
              <span>
                <i className="ph ph-buildings" aria-hidden="true"></i> Bailleur · {bailleurLabel}
              </span>
              {opp?.typeFinancement ? (
                <>
                  <span className="sep">·</span>
                  <span>
                    <i className="ph ph-tag" aria-hidden="true"></i> {opp.typeFinancement.replace(/_/g, " ").toLowerCase()}
                  </span>
                </>
              ) : null}
              {opp?.paysCible?.length ? (
                <>
                  <span className="sep">·</span>
                  <span>
                    <i className="ph ph-map-pin" aria-hidden="true"></i> {opp.paysCible.join(", ")}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge badge--review">
              <span className="dot"></span>
              {STATUT_LABEL[cand.statut]}
            </span>
            {jUntil != null && jUntil >= 0 && jUntil <= 30 ? (
              <span className="badge badge--warning">
                <span className="dot"></span>
                Clôture J‑{jUntil}
              </span>
            ) : null}
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="l">Documents complétés</div>
            <div className="v">
              {piecesCompleted} <em>/ {pieces.length}</em>
            </div>
          </div>
          <div className="stat">
            <div className="l">Score conformité IA</div>
            <div className="v">
              {piecesScoreConformite} <em>/ 100</em>
            </div>
          </div>
          <div className="stat">
            <div className="l">Date limite</div>
            <div className="v">
              {deadline ? new Date(deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
              {deadline ? <em> · {new Date(deadline).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</em> : null}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Enveloppe budgétaire ============ */}
      {(opp?.montantEstime || cand.budgetDemande || cand.coFinancement) ? (
        <section
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 6 }}>
              Montant AO bailleur
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)", lineHeight: 1 }}>
              {opp?.montantEstime
                ? `${new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(opp.montantEstime)} ${opp?.devise || "EUR"}`
                : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 4 }}>
              plafond financement
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 6 }}>
              Budget CHADIA demandé
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-terracotta)", lineHeight: 1 }}>
              {cand.budgetDemande
                ? `${new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(cand.budgetDemande)} ${cand.devise}`
                : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 4 }}>
              {opp?.montantEstime && cand.budgetDemande
                ? `${Math.round((cand.budgetDemande / opp.montantEstime) * 100)} % du plafond`
                : "à compléter"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 6 }}>
              Cofinancement
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)", lineHeight: 1 }}>
              {cand.coFinancement
                ? `${new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(cand.coFinancement)} ${cand.devise}`
                : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 4 }}>
              {cand.budgetDemande && cand.coFinancement
                ? `${Math.round((cand.coFinancement / (cand.budgetDemande + cand.coFinancement)) * 100)} % du total`
                : "tour de table à confirmer"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 6 }}>
              Durée prévue
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)", lineHeight: 1 }}>
              {cand.dureeMois ? `${cand.dureeMois} mois` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 4 }}>
              {cand.dateDepotPrevu ? `dépôt prévu ${new Date(cand.dateDepotPrevu).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : "calendrier à fixer"}
            </div>
          </div>
        </section>
      ) : null}

      {/* ============ Jalons / Timeline ============ */}
      <MilestonesTimeline milestones={milestones} />

      {/* ============ AI Scan banner ============ */}
      {opportuniteId ? (
        <div className="ai-scan">
          <div className="ai-scan-l">
            <span className="ai-mark">
              <i className="ph-fill ph-sparkle" aria-hidden="true"></i>
            </span>
            <div>
              <div className="eb">
                {hasAnalysis
                  ? `Analyse IA · ${analysis?._meta?.model ?? "Mistral"} · ${fmtDate(analysis?._meta?.analyzedAt)}`
                  : "Analyse IA non lancée"}
              </div>
              <h3>
                {hasAnalysis ? (
                  <>
                    Éligibilité : <em>compatible</em> — {pieces.length} pièces requises identifiées.
                  </>
                ) : (
                  <>
                    Lancez le <em>scan IA</em> pour extraire la trame du dossier.
                  </>
                )}
              </h3>
              <p>
                {analysis?.resume ??
                  "L'IA lira l'AO, extraira les documents à fournir, les critères d'éligibilité et la grille d'évaluation pondérée."}
              </p>
            </div>
          </div>
          <div className="ai-scan-stats">
            <div className="s">
              <div className="l">Éligibilité</div>
              <div className="v ok">
                {hasAnalysis ? <i className="ph ph-check" aria-hidden="true"></i> : "—"}
              </div>
            </div>
            <div className="s">
              <div className="l">Docs requis</div>
              <div className="v">{pieces.length}</div>
            </div>
            <div className="s">
              <div className="l">Critères évaluation</div>
              <div className="v">{criteresPond.length}</div>
            </div>
            <div className="s">
              <div className="l">Axes stratégiques</div>
              <div className="v w">{analysis?.axesStrategiques?.length ?? 0}</div>
            </div>
          </div>
          {canEdit ? (
            hasAnalysis && reAnalyze ? (
              <form action={reAnalyze}>
                <SubmitButton className="ai-scan-cta" icon="ph-arrow-clockwise" pendingLabel="Analyse en cours…">
                  Ré-analyser
                </SubmitButton>
              </form>
            ) : analyzeNow ? (
              <form action={analyzeNow}>
                <SubmitButton className="ai-scan-cta" icon="ph-magic-wand" pendingLabel="Analyse en cours…">
                  Lancer l&apos;analyse
                </SubmitButton>
              </form>
            ) : null
          ) : null}
        </div>
      ) : null}

      {/* ============ Eligibility + scoring grid ============ */}
      {/* P2-34 : la vérification d'éligibilité utilise désormais le profil
          organisation (Setting key=org.profile) plutôt qu'une heuristique
          de mots-clés génériques. Le composant gère lui-même le CTA quand
          le profil n'est pas renseigné. */}
      <EligibiliteCheck profile={orgProfile} eligibilite={eligibilite} libraryDocs={libraryDocs} />
      {/* La carte "Grille d'évaluation" s'affiche pleine largeur — l'ancien
          .elig-grid à 2 colonnes contenait élig + scoring, mais élig a migré
          dans EligibiliteCheck (V14). On garde juste .elig-card sans wrapper. */}
      <div className="elig-card" style={{ marginBottom: 18 }}>
          <h4>
            Grille d&apos;<em>évaluation</em> · {scoreIAMax} pts
          </h4>
          <div className="sub">
            Pondération extraite par Mistral · score IA estimé
          </div>
          <div className="elig-list">
            {criteresPond.map((c, i) => (
              <div key={i} className="score-row">
                <div>
                  <div className="t" style={{ color: "var(--color-ink)", fontWeight: 500 }}>{c.label}</div>
                  {c.description ? (
                    <div className="s" style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 2 }}>
                      {c.description}
                    </div>
                  ) : null}
                </div>
                <div className="pts">
                  {c.score}<small>/{c.ponderation}</small>
                </div>
                <div className={`bar ${c.bar >= 70 ? "s" : c.bar >= 40 ? "w" : ""}`}>
                  <span style={{ width: `${c.bar}%` }}></span>
                </div>
              </div>
            ))}
            {criteresPond.length > 0 ? (
              <div
                className="score-row"
                style={{ borderTop: "2px solid var(--color-line-strong)", paddingTop: 10, marginTop: 4 }}
              >
                <div>
                  <div className="t" style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--color-ink)" }}>
                    Score IA estimé
                  </div>
                </div>
                <div className="pts" style={{ color: "var(--color-terracotta)", fontSize: 16, fontWeight: 600 }}>
                  {scoreIATotal}<small>/{scoreIAMax}</small>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: scoreIATotal >= scoreIAMax * 0.7 ? "var(--color-success)" : "var(--color-warning)",
                    textAlign: "right",
                  }}
                >
                  {scoreIATotal >= scoreIAMax * 0.7 ? "Au-dessus seuil 70" : "À renforcer"}
                </div>
              </div>
            ) : null}
            <ScoreDetailModal
              criteres={criteresPond.map((c) => ({
                label: c.label,
                description: c.description,
                ponderation: c.ponderation,
                score: c.score,
                bar: c.bar,
              }))}
              pieces={pieces.map((p) => ({
                id: p.id,
                nom: p.nom,
                categorie: p.categorie,
                status: p.status,
                obligatoire: p.obligatoire,
              }))}
              scoreTotal={scoreIATotal}
              scoreMax={scoreIAMax}
            />
          </div>
      </div>

      {/* ============ Documents workspace (3 colonnes) ============ */}
      <DocsWorkspace
        candidatureId={cand.id}
        pieces={pieces}
        canEdit={canEdit}
        aiHints={aiHints}
        comments={[]}
        collaborateurs={(cand.equipe ?? []).slice(0, 4).map((initials, i) => ({
          initials: initials.slice(0, 2).toUpperCase(),
          tone: (["terracotta", "ink", "info", "success"] as const)[i % 4],
        }))}
        pieceActions={canEdit ? {
          add: piecesAddAction.bind(null, cand.id),
          // .bind() préserve le marquage "use server" du Server Action — une
          // arrow function inline (pieceId, fd) => ... ne le préserverait PAS
          // et déclencherait une erreur de sérialisation côté Client Component.
          update: piecesUpdateAction.bind(null, cand.id),
          remove: piecesRemoveAction.bind(null, cand.id),
        } : undefined}
        savePieceContent={canEdit ? savePieceContentAction.bind(null, cand.id) : undefined}
      />

      {/* ============ Import / Export bar ============ */}
      <div className="io-bar">
        <div className="col">
          <div className="lbl">
            <i className="ph ph-upload-simple" aria-hidden="true"></i> Importer un document existant
          </div>
          <div className="row">
            <button type="button" className="io-btn gdrive" disabled aria-disabled="true" title="Bientôt — OAuth Google requis">
              <span className="lg">G</span> Google Drive
            </button>
            <button type="button" className="io-btn onedrive" disabled aria-disabled="true" title="Bientôt — OAuth Microsoft requis">
              <span className="lg">M</span> OneDrive
            </button>
            <button type="button" className="io-btn dropbox" disabled aria-disabled="true" title="Bientôt — OAuth Dropbox requis">
              <span className="lg">D</span> Dropbox
            </button>
            <button type="button" className="io-btn" disabled aria-disabled="true" title="L'upload se fait depuis chaque pièce du workspace">
              <i className="ph ph-desktop" aria-hidden="true"></i> Mon ordinateur
            </button>
            <Link href="/bibliotheque" className="io-btn">
              <i className="ph ph-files" aria-hidden="true"></i> Bibliothèque CHADIA
            </Link>
            <Link href="/templates" className="io-btn">
              <i className="ph ph-scroll" aria-hidden="true"></i> Depuis un modèle
            </Link>
          </div>
        </div>
        <div className="col" style={{ alignItems: "flex-end" }}>
          <div className="lbl" style={{ alignSelf: "flex-end" }}>
            <i className="ph ph-download-simple" aria-hidden="true"></i> Exporter / déposer
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="io-btn" disabled aria-disabled="true" title="Export PDF pièce-par-pièce à venir">
              <span className="ftype pdf" style={{ padding: "0 6px", height: 18, fontSize: 9 }}>PDF</span> Document seul
            </button>
            <button type="button" className="io-btn" disabled aria-disabled="true" title="Export DOCX à venir">
              <span className="ftype doc" style={{ padding: "0 6px", height: 18, fontSize: 9 }}>DOCX</span> Document seul
            </button>
            <a href={`/api/tender/candidatures/${cand.id}/export.zip`} className="io-btn">
              <i className="ph ph-file-zip" aria-hidden="true"></i> Dossier complet (.zip)
            </a>
            <SelectiveExportModal
              candidatureId={cand.id}
              candidatureRef={cand.reference}
              documents={(cand.documents ?? []).map((d) => ({
                id: d.id,
                nom: d.nom,
                category: d.category,
                mimeType: d.mimeType,
                taille: d.taille,
              }))}
            />
            <button
              type="button"
              className="io-btn dark"
              disabled
              aria-disabled="true"
              title={
                opp?.sourceConnector
                  ? `Le portail ${opp.sourceConnector} est externe — soumission manuelle pour l'instant`
                  : "Soumission directe à venir"
              }
            >
              <i className="ph ph-paper-plane-tilt" aria-hidden="true"></i> Déposer sur le portail{" "}
              {opp?.sourceConnector ?? "bailleur"}
            </button>
          </div>
        </div>
      </div>

      {/* ============ Actions workflow — stepper visuel ============ */}
      <WorkflowStepper
        current={cand.statut}
        toEnRedaction={
          canEdit && cand.statut === "BROUILLON"
            ? transitionAction.bind(null, cand.id, "EN_REDACTION")
            : undefined
        }
        toEnValidation={
          canEdit && cand.statut === "EN_REDACTION"
            ? transitionAction.bind(null, cand.id, "EN_VALIDATION")
            : undefined
        }
        toSoumise={
          canEdit && cand.statut === "EN_VALIDATION"
            ? transitionAction.bind(null, cand.id, "SOUMISE")
            : undefined
        }
        toAttribuee={
          canEdit && cand.statut === "SOUMISE"
            ? transitionAction.bind(null, cand.id, "ATTRIBUEE")
            : undefined
        }
        toNonRetenue={
          canEdit && cand.statut === "SOUMISE"
            ? transitionAction.bind(null, cand.id, "NON_RETENUE")
            : undefined
        }
        toAbandonnee={
          canEdit &&
          cand.statut !== "ATTRIBUEE" &&
          cand.statut !== "NON_RETENUE" &&
          cand.statut !== "ABANDONNEE"
            ? transitionAction.bind(null, cand.id, "ABANDONNEE")
            : undefined
        }
        deleteSlot={
          session.user.role === "ADMIN" || session.user.role === "DIRECTEUR" ? (
            <DeleteCandidatureButton
              reference={cand.reference}
              deleteAction={deleteCandidatureAction.bind(null, cand.id)}
            />
          ) : undefined
        }
      />

      {/* ============ Q&A bailleur (V15 / P2-35) ============ */}
      <QAPanel
        candidatureId={cand.id}
        initialThread={Array.isArray(cand.qaThread) ? cand.qaThread : []}
        canEdit={canEdit}
        saveAction={saveQaThreadAction.bind(null, cand.id)}
      />

      {/* ============ Historique des changements de statut ============ */}
      <StatutHistorique
        events={history}
        currentStatut={STATUT_LABEL[cand.statut]}
      />
    </div>
  );
}
