"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import { useAutosave, formatRelative } from "@/hooks/useAutosave";
import { PieceEditModal } from "./PieceEditModal";
import { exec, wordCount, extractHeadings, textToHtml, defaultTemplate } from "./doc-utils";

/**
 * Liste des balises autorisées dans l'éditeur. Pas de <script>, <iframe>,
 * <object>, <embed>, événements inline (onclick…). DOMPurify supprime
 * silencieusement tout ce qui n'est pas dans la liste.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "u", "s", "code", "pre", "blockquote",
    "ul", "ol", "li",
    "a", "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
    "header", "section", "article", "footer",
  ],
  ALLOWED_ATTR: ["class", "href", "title", "id", "colspan", "rowspan"],
  // pas de target="_blank" automatique — le user décide
};

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

// ============================================================
// Types
// ============================================================
type PieceCategorie = "A" | "B" | "C" | "D" | "E";
type PieceStatus = "ok" | "draft" | "miss" | "ai";

export interface Piece {
  id: string;
  nom: string;
  description?: string | null;
  categorie: PieceCategorie;
  type?: "ADMIN" | "TECHNIQUE" | "FINANCIER" | "ANNEXE" | string;
  obligatoire?: boolean;
  format?: "PDF" | "DOCX" | "XLSX" | "LIBRE" | string;
  status?: PieceStatus;
  /** Si la pièce est rattachée à un document de la candidature, son id */
  documentId?: string | null;
  /** Texte courant de la pièce (note méthodologique = noteConcept de la candidature) */
  contenu?: string | null;
  /** Timestamp ISO de la dernière sauvegarde serveur (cand.pieceContents[id].updatedAt) */
  lastSavedAt?: string | null;
  /** Marqueur "pièce ajoutée manuellement" (vs. générée par Mistral) */
  _custom?: boolean;
}

interface Props {
  candidatureId: string;
  pieces: Piece[];
  /** Initiales pour les avatars de collaborateurs (mockup pour V1) */
  collaborateurs?: Array<{ initials: string; tone: "terracotta" | "ink" | "info" | "success" }>;
  /** Permet d'enregistrer la note méthodologique en appelant le Server Action via fetch */
  canEdit?: boolean;
  /** Suggestions IA prêtes à afficher (du résumé Mistral, des critères, etc.) */
  // Suggestions IA — body est string pour rester sérialisable depuis un
  // Server Component (les Server Components ne peuvent pas passer des
  // ReactNodes complexes à un Client Component sans serialisation).
  aiHints?: Array<{ title: string; body: string; primary?: string; secondary?: string }>;
  /** Commentaires (V1 : statiques) */
  comments?: Array<{ author: string; tone: "ink" | "terracotta"; when: string; body: React.ReactNode; isAi?: boolean }>;
  /** Server Actions pour gérer l'arborescence (ADMIN/DIRECTEUR/FINANCIER) */
  pieceActions?: {
    add: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
    update: (pieceId: string, formData: FormData) => Promise<{ ok: boolean; error?: string }>;
    remove: (pieceId: string) => Promise<{ ok: boolean; error?: string }>;
  };
  /** Action serveur pour sauvegarder le contenu HTML d'une pièce (autosave) */
  savePieceContent?: (pieceId: string, html: string) => Promise<{ ok: boolean; error?: string }>;
}

const CAT_LABEL: Record<PieceCategorie, string> = {
  A: "A · Pièces administratives",
  B: "B · Capacité technique",
  C: "C · Note méthodologique",
  D: "D · Budget & ressources",
  E: "E · Équipe & annexes",
};

const FMT_CLASS: Record<string, string> = {
  PDF: "pdf",
  DOCX: "doc",
  DOC: "doc",
  XLSX: "xls",
  XLS: "xls",
};

function statusBadge(s?: PieceStatus): { className: string; icon: string } {
  if (s === "ok") return { className: "st ok", icon: "ph ph-check" };
  if (s === "draft") return { className: "st draft", icon: "ph ph-pencil-simple" };
  if (s === "ai") return { className: "st ai", icon: "ph ph-sparkle" };
  return { className: "st miss", icon: "ph ph-x" };
}

function fmtClass(fmt?: string): string {
  if (!fmt) return "doc";
  return FMT_CLASS[fmt.toUpperCase()] || "doc";
}

type Mode = "edit" | "pdf" | "outline" | "comments" | "versions";

/** Déduit la section IA (contexte | pertinence | methodologie | genre | calendrier)
 *  à partir du nom de la pièce sélectionnée. Si pas de mapping trouvé,
 *  retourne null → le bouton "Régénérer IA" affiche un avertissement. */
function inferDraftSection(pieceNom: string): "contexte" | "pertinence" | "methodologie" | "genre" | "calendrier" | null {
  const n = pieceNom.toLowerCase();
  if (/(m[ée]thodologie|approche|strat[ée]gie d.intervention|plan d.action)/.test(n)) return "methodologie";
  if (/(contexte|justification|analyse de la situation|cadre de r[ée]f[ée]rence)/.test(n)) return "contexte";
  if (/(pertinence|coh[ée]rence|alignement|valeur ajout[ée]e)/.test(n)) return "pertinence";
  if (/(genre|inclusion|vbg|sauvegarde|peas|protection)/.test(n)) return "genre";
  if (/(calendrier|chronogramme|planning|gantt|[ée]ch[ée]ancier)/.test(n)) return "calendrier";
  return null;
}

export function DocsWorkspace({
  candidatureId,
  pieces,
  collaborateurs = [
    { initials: "AS", tone: "terracotta" },
    { initials: "MM", tone: "ink" },
    { initials: "FH", tone: "info" },
  ],
  canEdit = true,
  aiHints = [],
  comments = [],
  pieceActions,
  savePieceContent,
}: Props) {
  // ====== State pour l'édition de l'arborescence ======
  // Modal de création/édition d'une pièce.
  const [editingPiece, setEditingPiece] = useState<{ mode: "add" | "edit"; piece?: Piece; categorie?: string } | null>(null);
  // Menu d'actions ouvert sur une pièce particulière (id de la pièce ou null).
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // Suppression en cours pour afficher un état loading.
  const [removing, setRemoving] = useState<string | null>(null);
  // Pièce dont la suppression est en cours de confirmation (modal ouverte).
  const [pieceToRemove, setPieceToRemove] = useState<Piece | null>(null);
  // Fermer le menu d'actions sur click extérieur (audit P1-6).
  useEffect(() => {
    if (!openMenuId) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest(".piece-edit-menu") && !target.closest(".piece-edit-btn")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenuId]);
  // Pièce sélectionnée : par défaut la première de la catégorie C (note méthodo)
  // qui est l'archétype du document éditable.
  const initialPiece = useMemo(() => {
    return (
      pieces.find((p) => p.categorie === "C" && p.nom.toLowerCase().includes("méthodo")) ??
      pieces.find((p) => p.status !== "ok") ??
      pieces[0]
    );
  }, [pieces]);

  const [selectedId, setSelectedId] = useState<string | undefined>(initialPiece?.id);
  const selected = pieces.find((p) => p.id === selectedId) ?? initialPiece;
  // Mode par défaut = "pdf" (viewer lecture seule) au lieu de l'éditeur HTML.
  // L'app n'est plus un éditeur WYSIWYG ; on délègue l'édition à Word/LibreOffice
  // via export DOCX.
  const [mode, setMode] = useState<Mode>("pdf");
  // État pour le bouton "Régénérer avec IA" — disable pendant l'appel.
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Compteurs par catégorie pour les chips de comptage
  const byCat = useMemo(() => {
    const acc: Record<PieceCategorie, { total: number; ok: number }> = {
      A: { total: 0, ok: 0 },
      B: { total: 0, ok: 0 },
      C: { total: 0, ok: 0 },
      D: { total: 0, ok: 0 },
      E: { total: 0, ok: 0 },
    };
    for (const p of pieces) {
      acc[p.categorie].total++;
      if (p.status === "ok") acc[p.categorie].ok++;
    }
    return acc;
  }, [pieces]);

  const totalCompleted = pieces.filter((p) => p.status === "ok").length;
  const totalPct = pieces.length > 0 ? Math.round((totalCompleted / pieces.length) * 100) : 0;

  // ====== Éditeur central : contenu + autosave ======
  // editedHtml = source de vérité côté client (ce qui est dans le DOM
  // contenteditable). On l'initialise depuis le contenu serveur ou un
  // template par défaut quand on change de pièce.
  // On utilise un dépendency uniquement sur selectedId — on NE veut PAS
  // re-init quand `selected.contenu` change pour une autre raison (sinon
  // la sauvegarde re-déclencherait un cycle).
  const [editedHtml, setEditedHtml] = useState<string>("");
  useEffect(() => {
    if (!selected) { setEditedHtml(""); return; }
    // P0 sécurité : sanitize aussi à la lecture (défense en profondeur). Le
    // backend sanitize à l'écriture depuis le Sprint 1, mais la DB peut
    // contenir du HTML legacy non assaini d'avant cette sécurisation.
    const raw = selected.contenu ? textToHtml(selected.contenu) : defaultTemplate(selected);
    setEditedHtml(sanitizeHtml(raw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Save callback : appelle l'action serveur en sanitizant le HTML
  // pour défense en profondeur (XSS au paste). Si pas de save fournie
  // (mode démo) ou pas de pièce sélectionnée, no-op.
  const doSavePiece = useCallback(async (html: string) => {
    if (!savePieceContent || !selected) return;
    const safe = sanitizeHtml(html);
    const res = await savePieceContent(selected.id, safe);
    if (!res.ok) throw new Error(res.error || "Erreur de sauvegarde");
  }, [savePieceContent, selected]);

  // Hook d'autosave debouncé (1.5s). On flush quand on change de pièce
  // pour ne pas perdre les dernières frappes. Le `initialLastSavedAt` permet
  // d'afficher "Enregistré il y a Xmin" dès le chargement de la page, sans
  // attendre une frappe.
  const initialSaved = selected?.lastSavedAt ? new Date(selected.lastSavedAt) : null;
  const autosave = useAutosave({
    value: editedHtml,
    onSave: doSavePiece,
    delay: 1500,
    disabled: !canEdit || !savePieceContent || !selected,
    skipKey: selectedId,
    initialLastSavedAt: initialSaved,
  });

  // P0-fix race condition : on capture chaque frappe avec son pieceId associé
  // dans une ref dédiée. Quand l'utilisateur switche de pièce, on lit cette
  // ref pour récupérer l'ANCIENNE valeur (avec le BON pieceId) et la sauver
  // explicitement — au lieu de relier `autosave.flush()` qui aurait utilisé
  // `selected.id` (déjà devenu la nouvelle pièce après le re-render).
  const lastUserEditRef = useRef<{ pieceId: string; html: string } | null>(null);

  const prevSelectedIdRef = useRef<string | undefined>(selectedId);
  useEffect(() => {
    const prev = prevSelectedIdRef.current;
    if (prev && prev !== selectedId) {
      const lastEdit = lastUserEditRef.current;
      if (
        lastEdit &&
        lastEdit.pieceId === prev &&
        savePieceContent &&
        canEdit
      ) {
        // On sauve l'ancien contenu sur l'ANCIEN pieceId.
        const safe = sanitizeHtml(lastEdit.html);
        savePieceContent(prev, safe).catch(() => {
          // Erreur silencieuse : l'utilisateur a déjà switché, on ne peut
          // pas afficher d'état "erreur" lié à une pièce qui n'est plus
          // sélectionnée. À muscler avec un toast global plus tard.
        });
      }
      prevSelectedIdRef.current = selectedId;
      // Reset la ref pour la nouvelle pièce
      lastUserEditRef.current = null;
    }
  }, [selectedId, savePieceContent, canEdit]);

  // Memoize les calculs coûteux qui dépendent du HTML édité (P1-19).
  // wordCount() fait un regex/split sur tout le HTML — recalculé à chaque
  // frappe c'était ~10ms × 60 frappes/min = lag perceptible.
  // useMemo cache le résultat tant qu'editedHtml n'a pas changé.
  const wordCountMemo = useMemo(() => wordCount(editedHtml), [editedHtml]);
  const headingsMemo = useMemo(() => extractHeadings(editedHtml), [editedHtml]);
  const sanitizedHtml = useMemo(() => sanitizeHtml(editedHtml), [editedHtml]);

  // Forcer un re-render du libellé "Enregistré il y a Xs" toutes les 10s
  // pour qu'il reste à jour sans interaction utilisateur.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!autosave.lastSavedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, [autosave.lastSavedAt]);

  // Libellé affiché dans la barre de statut de l'éditeur.
  const saveStatusLabel = (() => {
    if (!savePieceContent) return null;             // pas d'autosave configuré
    if (autosave.status === "saving") return { text: "Enregistrement…", tone: "warn" as const };
    if (autosave.status === "error") return { text: `Erreur · ${autosave.error}`, tone: "error" as const };
    if (autosave.status === "saved" || autosave.lastSavedAt) {
      return { text: `Enregistré ${formatRelative(autosave.lastSavedAt)}`, tone: "ok" as const };
    }
    return null;
  })();

  // ============ Render ============
  return (
    <>
    {editingPiece && pieceActions ? (
      <PieceEditModal
        mode={editingPiece.mode}
        piece={editingPiece.piece}
        defaultCategorie={editingPiece.categorie as PieceCategorie | undefined}
        onClose={() => setEditingPiece(null)}
        onSubmit={async (fd) => {
          if (editingPiece.mode === "add") {
            const res = await pieceActions.add(fd);
            if (!res.ok) return { ok: false, error: res.error };
          } else if (editingPiece.piece) {
            const res = await pieceActions.update(editingPiece.piece.id, fd);
            if (!res.ok) return { ok: false, error: res.error };
          }
          setEditingPiece(null);
          return { ok: true };
        }}
      />
    ) : null}
    {pieceToRemove && pieceActions ? (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setPieceToRemove(null); }}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(26,22,18,0.55)", backdropFilter: "blur(4px)",
          display: "grid", placeItems: "center", padding: 24,
        }}
      >
        <div style={{
          background: "var(--color-surface)", borderRadius: 12,
          width: "100%", maxWidth: 460, padding: 20,
          boxShadow: "0 24px 60px -20px rgba(26,22,18,0.4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <i className="ph-fill ph-warning-octagon" style={{ color: "var(--color-danger)", fontSize: 28 }} aria-hidden="true"></i>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, margin: 0 }}>
              Retirer la pièce <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>{pieceToRemove.nom}</em> ?
            </h4>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-shale)", lineHeight: 1.5, margin: "0 0 14px" }}>
            La pièce est retirée de l&apos;arborescence du dossier mais les documents déjà téléversés associés restent dans la bibliothèque. Tu pourras les rattacher à une autre pièce si besoin.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPieceToRemove(null)}
              className="btn btn--ghost btn--sm"
              disabled={removing === pieceToRemove.id}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={async () => {
                const pid = pieceToRemove.id;
                setPieceToRemove(null);
                setRemoving(pid);
                try {
                  const res = await pieceActions.remove(pid);
                  if (!res.ok) {
                    // On affiche l'erreur dans le menu plutôt qu'avec alert()
                    // mais à ce stade le menu est déjà fermé — un toast serait
                    // plus propre, à ajouter avec un système global.
                    console.error("Suppression pièce :", res.error);
                  }
                } finally {
                  setRemoving(null);
                }
              }}
              className="btn btn--danger btn--sm"
              disabled={removing === pieceToRemove.id}
            >
              {removing === pieceToRemove.id ? "Suppression…" : "Oui, retirer"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    <div className="docs-shell">
      {/* LEFT — Tree */}
      <nav className="docs-tree" aria-label="Arborescence du dossier">
        <div className="docs-tree-h">
          <div className="ttl">Arborescence du dossier</div>
          <div className="sub">
            {totalCompleted} / {pieces.length} complétés
            <div className="bar"><span style={{ width: `${totalPct}%` }}></span></div>
          </div>
        </div>

        {(["A", "B", "C", "D", "E"] as PieceCategorie[]).map((cat) => {
          const items = pieces.filter((p) => p.categorie === cat);
          const showCat = items.length > 0 || canEdit;
          if (!showCat) return null;
          return (
            <div key={cat} className="docs-cat">
              <div className="docs-cat-h">
                {CAT_LABEL[cat]}
                <span className="ct">{byCat[cat].ok}/{byCat[cat].total}</span>
              </div>
              {items.map((p) => {
                const sb = statusBadge(p.status);
                const isCustom = (p as Piece & { _custom?: boolean })._custom === true;
                return (
                  <div key={p.id} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`doc-tab ${p.id === selectedId ? "on" : ""}`}
                      title={p.description ?? p.nom}
                    >
                      <span className={`ic ${fmtClass(p.format)}`}>{(p.format || "DOC").slice(0, 3).toUpperCase()}</span>
                      <span className="nm">
                        {p.nom}
                        {isCustom ? <span style={{ marginLeft: 4, fontSize: 8, color: "var(--color-terracotta)", verticalAlign: "super" }}>•</span> : null}
                      </span>
                      <span className={sb.className}>
                        <i className={sb.icon} aria-hidden="true"></i>
                      </span>
                    </button>
                    {canEdit && pieceActions ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === p.id ? null : p.id);
                        }}
                        className="piece-edit-btn"
                        aria-label="Actions sur la pièce"
                        title="Modifier ou supprimer"
                      >
                        <i className="ph ph-dots-three-vertical" aria-hidden="true"></i>
                      </button>
                    ) : null}
                    {openMenuId === p.id && pieceActions ? (
                      <div className="piece-edit-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPiece({ mode: "edit", piece: p });
                            setOpenMenuId(null);
                          }}
                        >
                          <i className="ph ph-pencil-simple" aria-hidden="true"></i> Modifier la pièce
                        </button>
                        <button
                          type="button"
                          disabled={removing === p.id}
                          onClick={() => {
                            setOpenMenuId(null);
                            setPieceToRemove(p);
                          }}
                          style={{ color: "var(--color-danger)" }}
                        >
                          <i className="ph ph-trash" aria-hidden="true"></i> {removing === p.id ? "Suppression…" : "Retirer du dossier"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {canEdit && pieceActions ? (
                <button
                  type="button"
                  onClick={() => setEditingPiece({ mode: "add", categorie: cat })}
                  className="piece-add-btn"
                >
                  <i className="ph ph-plus" aria-hidden="true"></i> Ajouter une pièce
                </button>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* CENTER — Document viewer */}
      <div className="doc-viewer">
        <div className="doc-vh">
          <div className="info">
            <div className="crumb">
              {selected ? `${CAT_LABEL[selected.categorie]}  ›  ${selected.nom}` : "—"}
            </div>
            <div className="ttl">
              {selected ? (
                <>
                  {selected.nom.split(" ").slice(0, -1).join(" ")}{" "}
                  <em>{selected.nom.split(" ").slice(-1).join(" ")}</em>
                </>
              ) : (
                "Aucune pièce sélectionnée"
              )}
            </div>
          </div>
          <div className="doc-vh-acts">
            {/* Régénérer avec IA : appelle /api/tender/candidatures/{id}/draft/{section}
                puis met à jour le contenu local. La "section" est déduite du
                nom de la pièce (méthodologie, contexte, pertinence, etc.). */}
            {selected && canEdit ? (
              <button
                type="button"
                className="dv-btn"
                disabled={isRegenerating}
                onClick={async () => {
                  if (!selected) return;
                  const section = inferDraftSection(selected.nom);
                  if (!section) {
                    alert("Cette pièce n'a pas de générateur IA dédié pour le moment.");
                    return;
                  }
                  if (!confirm(`Régénérer le contenu IA pour "${selected.nom}" ?\nL'IA s'inspirera de votre profil organisation et des documents de la bibliothèque.`)) return;
                  setIsRegenerating(true);
                  try {
                    const r = await fetch(`/api/tender/candidatures/${candidatureId}/draft/${section}`, { method: "POST", credentials: "include" });
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    const data = await r.json();
                    const newHtml = textToHtml(data.text || "");
                    setEditedHtml(newHtml);
                    if (savePieceContent) await savePieceContent(selected.id, newHtml);
                  } catch (e) {
                    alert("Génération IA échouée : " + (e instanceof Error ? e.message : String(e)));
                  } finally {
                    setIsRegenerating(false);
                  }
                }}
                title="Régénérer le contenu avec l'IA (utilise le profil + la bibliothèque)"
              >
                <i className={isRegenerating ? "ph ph-circle-notch" : "ph-fill ph-sparkle"} style={isRegenerating ? { animation: "spin 1s linear infinite" } : { color: "var(--color-terracotta)" }} aria-hidden="true"></i>
                {isRegenerating ? "Génération…" : "Régénérer IA"}
              </button>
            ) : null}

            {/* Ouvrir avec Word / LibreOffice : télécharge le DOCX puis OS l'ouvre. */}
            <a
              href={selected ? `/api/tender/candidatures/${candidatureId}/pieces/${selected.id}/export-docx` : "#"}
              className="dv-btn word"
              aria-disabled={!selected}
              onClick={(e) => { if (!selected) e.preventDefault(); }}
              title="Télécharger en .docx → ouvrir dans Word/LibreOffice"
            >
              <i className="ph ph-microsoft-word-logo" aria-hidden="true"></i> Word
            </a>

            {/* Partager : copie un lien direct vers la candidature avec ancre sur la pièce. */}
            <button
              type="button"
              className="dv-btn"
              disabled={!selected}
              onClick={async () => {
                if (!selected) return;
                const url = `${window.location.origin}/candidatures/${candidatureId}#piece-${selected.id}`;
                try {
                  await navigator.clipboard.writeText(url);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2200);
                } catch {
                  prompt("Copiez ce lien :", url);
                }
              }}
              title="Copier un lien direct vers cette pièce"
            >
              <i className={shareCopied ? "ph ph-check" : "ph ph-share-network"} aria-hidden="true" style={shareCopied ? { color: "var(--color-success)" } : undefined}></i>
              {shareCopied ? "Lien copié" : "Partager"}
            </button>

            {/* Exporter : DOCX direct (le téléchargement local est le cas le plus
                courant). Pour ZIP du dossier complet, voir le bouton "Export"
                de la page candidature (Selective Export Modal). */}
            <a
              href={selected ? `/api/tender/candidatures/${candidatureId}/pieces/${selected.id}/export-docx` : "#"}
              className="dv-btn primary"
              aria-disabled={!selected}
              onClick={(e) => { if (!selected) e.preventDefault(); }}
              title="Télécharger cette pièce au format Word"
            >
              <i className="ph ph-download-simple" aria-hidden="true"></i> Exporter .docx
            </a>
          </div>
        </div>

        <div className="doc-vmode" role="tablist">
          {([
            // Mode "edit" retiré — l'app est désormais un viewer. Édition
            // se fait dans Word/LibreOffice via "Exporter .docx".
            { id: "pdf",      icon: "ph ph-file-pdf",          label: "Aperçu" },
            { id: "outline",  icon: "ph ph-list-bullets",      label: "Plan" },
            { id: "comments", icon: "ph ph-chat-circle-text",  label: "Commentaires", count: comments.length },
            { id: "versions", icon: "ph ph-clock-counter-clockwise", label: "Versions" },
          ] as const).map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              className={`m ${mode === m.id ? "on" : ""}`}
              onClick={() => setMode(m.id as Mode)}
            >
              <i className={m.icon} aria-hidden="true"></i> {m.label}
              {"count" in m && m.count ? (
                <span className="badge" style={{ padding: "1px 6px", fontSize: 10, height: "auto", marginLeft: 2 }}>
                  {m.count}
                </span>
              ) : null}
            </button>
          ))}
          <span className="spacer"></span>
          <div className="meta">
            {saveStatusLabel ? (
              <span
                className={saveStatusLabel.tone === "ok" ? "saved" : ""}
                style={{
                  color: saveStatusLabel.tone === "warn" ? "var(--color-warning)"
                       : saveStatusLabel.tone === "error" ? "var(--color-danger)"
                       : undefined,
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}
                title={autosave.error || undefined}
              >
                {saveStatusLabel.tone === "warn" ? (
                  <i className="ph ph-circle-notch" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true"></i>
                ) : saveStatusLabel.tone === "error" ? (
                  <i className="ph ph-warning-circle" aria-hidden="true"></i>
                ) : null}
                {saveStatusLabel.text}
              </span>
            ) : null}
            <span>{wordCountMemo} mots</span>
          </div>
        </div>

        {/* Mode édition retiré de l'UI (l'app est devenue un viewer).
            On garde le bloc en `display:none` pour préserver `editedHtml`
            partagé avec l'aperçu PDF et la régénération IA, mais l'utilisateur
            ne peut plus y accéder via onglet. Toolbar conservée pour usage
            futur (admin via flag) mais cachée par défaut. */}
        <div className="doc-mode" style={{ display: "none" }}>
          <div className="doc-toolbar">
            <button type="button" className="sel" disabled>
              Titre 2 <i className="ph ph-caret-down" aria-hidden="true"></i>
            </button>
            <button type="button" className="sel" disabled>
              Plus Jakarta <i className="ph ph-caret-down" aria-hidden="true"></i>
            </button>
            <button type="button" className="sel sm" disabled>
              13 <i className="ph ph-caret-down" aria-hidden="true"></i>
            </button>
            <span className="sep"></span>
            <button type="button" className="tg" title="Gras" style={{ fontWeight: 700 }} onClick={() => exec("bold")}>B</button>
            <button type="button" className="tg" title="Italique" style={{ fontStyle: "italic" }} onClick={() => exec("italic")}>I</button>
            <button type="button" className="tg" title="Souligné" style={{ textDecoration: "underline" }} onClick={() => exec("underline")}>U</button>
            <button type="button" className="tg" title="Barré" style={{ textDecoration: "line-through" }} onClick={() => exec("strikeThrough")}>S</button>
            <span className="sep"></span>
            <button type="button" className="tg" onClick={() => exec("justifyLeft")}><i className="ph ph-text-align-left" aria-hidden="true"></i></button>
            <button type="button" className="tg on" onClick={() => exec("justifyFull")}><i className="ph ph-text-align-justify" aria-hidden="true"></i></button>
            <button type="button" className="tg" onClick={() => exec("insertUnorderedList")}><i className="ph ph-list-bullets" aria-hidden="true"></i></button>
            <button type="button" className="tg" onClick={() => exec("insertOrderedList")}><i className="ph ph-list-numbers" aria-hidden="true"></i></button>
            <span className="sep"></span>
            <button type="button" className="tg" title="Lien"><i className="ph ph-link-simple" aria-hidden="true"></i></button>
            <button type="button" className="tg" title="Image"><i className="ph ph-image" aria-hidden="true"></i></button>
            <button type="button" className="tg" title="Tableau"><i className="ph ph-table" aria-hidden="true"></i></button>
            <button type="button" className="ai-btn" title="Bientôt branché sur Mistral pour rédaction inline">
              <i className="ph-fill ph-sparkle" aria-hidden="true"></i> Assister avec l&apos;IA
            </button>
          </div>

          <div className="doc-pad">
            <article
              key={selectedId}
              className="doc-page"
              contentEditable={canEdit}
              suppressContentEditableWarning
              spellCheck
              role="textbox"
              aria-multiline="true"
              aria-label={selected ? `Éditer la pièce ${selected.nom}` : "Éditeur de pièce"}
              aria-readonly={!canEdit}
              onInput={(e) => {
                const html = (e.target as HTMLElement).innerHTML;
                setEditedHtml(html);
                // Snapshot pour le flush au switch de pièce (P0-fix race)
                if (selected) lastUserEditRef.current = { pieceId: selected.id, html };
              }}
              dangerouslySetInnerHTML={{ __html: editedHtml }}
            />
          </div>
        </div>

        <div className="doc-mode" style={{ display: mode === "pdf" ? "block" : "none" }}>
          <div className="doc-pad">
            <article className="doc-page" style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
          </div>
        </div>

        <div className="doc-mode" style={{ display: mode === "outline" ? "block" : "none", padding: 32, color: "var(--color-stone)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "var(--color-ink)", margin: "0 0 12px" }}>
            Plan du document
          </h3>
          <ul style={{ fontSize: 13, lineHeight: 1.8, color: "var(--color-sepia)" }}>
            {headingsMemo.map((h, i) => (
              <li key={i} style={{ paddingLeft: (h.level - 1) * 16 }}>{h.text}</li>
            ))}
            {headingsMemo.length === 0 ? (
              <li style={{ color: "var(--color-stone)", fontStyle: "italic" }}>
                Aucun titre détecté. Utilisez les styles h1/h2 dans le mode Édition.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="doc-mode" style={{ display: mode === "comments" ? "flex" : "none", flexDirection: "column", gap: 12, padding: 24 }}>
          {comments.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-stone)", margin: 0 }}>
              Aucun commentaire pour l&apos;instant. Cliquez sur un passage dans l&apos;éditeur pour le commenter.
            </p>
          ) : (
            comments.map((c, i) => (
              <div key={i} className={`cmt ${c.isAi ? "ai" : ""}`}>
                <div className="cmt-h">
                  <div className={`avatar avatar--xs avatar--${c.tone}`}>
                    {c.isAi ? <i className="ph-fill ph-sparkle" style={{ fontSize: 11 }} aria-hidden="true"></i> : c.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="nm">{c.author}</div>
                  <div className="when">{c.when}</div>
                </div>
                <div className="cmt-body">{c.body}</div>
              </div>
            ))
          )}
        </div>

        <div className="doc-mode" style={{ display: mode === "versions" ? "block" : "none", padding: 32, color: "var(--color-stone)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "var(--color-ink)", margin: "0 0 12px" }}>
            Historique des versions
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            L&apos;historique de versions s&apos;activera quand l&apos;édition collaborative sera branchée (à venir).
            Pour l&apos;instant chaque sauvegarde côté serveur génère un point de retour.
          </p>
        </div>

        <div className="doc-vfoot">
          <div className="collabs">
            {collaborateurs.map((c, i) => (
              <div key={i} className={`avatar avatar--xs avatar--${c.tone}`}>
                {c.initials}
              </div>
            ))}
            <span style={{ marginLeft: 10, color: "var(--color-sepia)" }}>
              {collaborateurs.length} contributeur{collaborateurs.length > 1 ? "s" : ""} sur cette pièce
            </span>
          </div>
          <div>Version locale · sauvegarde automatique vers la bibliothèque</div>
        </div>
      </div>

      {/* RIGHT — AI + comments side */}
      <div className="doc-side">
        <div className="ai-panel">
          <div className="ai-panel-h">
            <span className="ai-mark">
              <i className="ph-fill ph-sparkle" aria-hidden="true"></i>
            </span>
            <div>
              <div className="t">Assistant rédaction</div>
              <div className="s">CHADIA AI · contexte PRAG</div>
            </div>
          </div>

          {aiHints.length > 0 ? (
            aiHints.map((h, i) => (
              <div key={i} className="ai-suggest">
                <div className="eb">
                  <i className="ph ph-lightbulb" aria-hidden="true"></i> {h.title}
                </div>
                <p>{h.body}</p>
                <div className="acts">
                  {h.primary ? (
                    <button type="button" className="ai-mini-btn primary" disabled aria-disabled="true">
                      <i className="ph ph-magic-wand" aria-hidden="true"></i> {h.primary}
                    </button>
                  ) : null}
                  {h.secondary ? (
                    <button type="button" className="ai-mini-btn" disabled aria-disabled="true">
                      {h.secondary}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="ai-suggest">
              <div className="eb"><i className="ph ph-lightbulb" aria-hidden="true"></i> Aucune suggestion</div>
              <p>Lancez l&apos;analyse IA en haut de page pour générer des recommandations contextuelles.</p>
            </div>
          )}

          <div className="ai-ask">
            <textarea placeholder="« Réécris 3.3 en mettant l'accent sur le genre » · « vérifie la conformité PRAG »…" disabled></textarea>
            <button type="button" title="Bientôt disponible" disabled aria-disabled="true">
              <i className="ph-fill ph-paper-plane-tilt" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div className="side-card">
          <h4>
            <i className="ph ph-chat-circle-text" style={{ fontSize: 18, color: "var(--color-terracotta)" }} aria-hidden="true"></i>
            Commentaires
            <span className="ct">{comments.length}</span>
          </h4>
          {comments.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>
              La collaboration multi-utilisateur arrive. Pour l&apos;instant un seul rédacteur à la fois.
            </p>
          ) : (
            comments.map((c, i) => (
              <div key={i} className={`cmt ${c.isAi ? "ai" : ""}`}>
                <div className="cmt-h">
                  <div className={`avatar avatar--xs avatar--${c.tone}`}>
                    {c.isAi ? <i className="ph-fill ph-sparkle" style={{ fontSize: 11 }} aria-hidden="true"></i> : c.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="nm">{c.author}</div>
                  <div className="when">{c.when}</div>
                </div>
                <div className="cmt-body">{c.body}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .piece-edit-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          background: transparent;
          border: 0;
          border-radius: 4px;
          color: var(--color-stone);
          cursor: pointer;
          opacity: 0;
          transition: opacity 100ms;
        }
        .piece-edit-btn:hover,
        .piece-edit-btn:focus-visible { background: var(--color-canvas); color: var(--color-ink); }
        .piece-edit-btn:focus-visible {
          outline: 2px solid var(--color-terracotta);
          outline-offset: 1px;
        }
        /* Visible au hover ET au focus clavier (sinon le bouton est invisible
           pour les utilisateurs au clavier — P0 a11y). focus-within sur le
           parent garantit qu'on voit aussi le bouton quand on tab dans la
           ligne de pièce sans hover. */
        div:hover > .piece-edit-btn,
        div:focus-within > .piece-edit-btn,
        .piece-edit-btn:focus-visible { opacity: 1; }
        .piece-edit-menu {
          position: absolute;
          right: 4px;
          top: 32px;
          z-index: 30;
          min-width: 190px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 8px;
          box-shadow: 0 8px 24px -10px rgba(26, 22, 18, 0.18);
          padding: 4px;
          display: flex; flex-direction: column;
          font-size: 12px;
        }
        .piece-edit-menu button {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 10px;
          font-family: inherit;
          background: transparent;
          border: 0;
          text-align: left;
          color: var(--color-sepia);
          border-radius: 4px;
          cursor: pointer;
        }
        .piece-edit-menu button:hover { background: var(--color-canvas); color: var(--color-ink); }
        .piece-edit-menu button:disabled { opacity: 0.5; cursor: not-allowed; }
        .piece-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          margin-top: 4px;
          font-size: 11.5px;
          color: var(--color-terracotta);
          background: transparent;
          border: 1px dashed var(--color-terracotta-line);
          border-radius: 6px;
          width: 100%;
          cursor: pointer;
          font-family: inherit;
        }
        .piece-add-btn:hover { background: var(--color-terracotta-soft); }
      `}</style>
    </div>
    </>
  );
}
