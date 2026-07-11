"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "./Dialog";

interface Props {
  /** ID auquel rattacher le document (au moins un parmi les options ci-dessous) */
  projetId?: string;
  opportuniteId?: string;
  candidatureId?: string;
  /** Pièce de l'arborescence à laquelle ce document est rattaché. Optionnel
   *  (ex: téléversement libre dans la bibliothèque). FK directe vers une
   *  pièce — remplace le matching fragile par tags (audit P0-3). */
  pieceId?: string;
  /** @deprecated remplacés par opportuniteId / candidatureId — gardés pour compat. */
  appelOffreId?: string;
  fournisseurId?: string;
  soumissionId?: string;
  /** Catégorie par défaut (pour la bibliothèque) */
  defaultCategory?: string;
  /** Type métier par défaut */
  defaultType?: string;
  /** Visibilité par défaut */
  defaultVisibility?: "PUBLIC" | "INTERNE" | "CONFIDENTIEL";
  /** Étiquette du bouton */
  buttonLabel?: string;
  /** Mode compact (juste le bouton) */
  compact?: boolean;
}

const CATEGORIES = [
  { v: "MODELES_AO", l: "Modèles d'AO", icon: "ph-scroll" },
  { v: "STATUTS_JURIDIQUE", l: "Statuts & juridique", icon: "ph-file-text" },
  { v: "PROJETS", l: "Projets", icon: "ph-folders" },
  { v: "CONVENTIONS_BAILLEURS", l: "Conventions bailleurs", icon: "ph-handshake" },
  { v: "COMPTABILITE", l: "Comptabilité", icon: "ph-coins" },
  { v: "MEDIAS_TERRAIN", l: "Médias terrain", icon: "ph-camera" },
  { v: "RAPPORTS", l: "Rapports", icon: "ph-file-pdf" },
  { v: "AUTRE", l: "Autre", icon: "ph-folder" },
];

const TYPES = [
  { v: "TDR", l: "TDR" },
  { v: "RAPPORT_ACTIVITE", l: "Rapport d'activité" },
  { v: "BUDGET", l: "Budget" },
  { v: "CONTRAT", l: "Contrat" },
  { v: "PROCES_VERBAL", l: "PV" },
  { v: "MANUEL", l: "Manuel" },
  { v: "STATUT", l: "Statut" },
  { v: "TEMPLATE", l: "Modèle" },
  { v: "PHOTO_TERRAIN", l: "Photo terrain" },
  { v: "AUTRE", l: "Autre" },
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB — limite tender MAX_UPLOAD_SIZE

/** Heuristique : devine la catégorie/type d'un fichier depuis son nom.
 *  Économise un clic à l'utilisateur dans 80% des cas. */
function autoCategorize(filename: string): { category: string; type: string } {
  const n = filename.toLowerCase();
  if (/bilan|dsf|etat.+financier|finance|compte/.test(n)) return { category: "COMPTABILITE", type: "RAPPORT_ACTIVITE" };
  if (/rapport[_ -](activite|annuel|d'activite|programme)/.test(n)) return { category: "RAPPORTS", type: "RAPPORT_ACTIVITE" };
  if (/manuel|procedure|pmp/.test(n)) return { category: "AUTRE", type: "MANUEL" };
  if (/statut|autorisation|recipisse|nif|organigramme/.test(n)) return { category: "STATUTS_JURIDIQUE", type: "STATUT" };
  if (/contrat|convention|accord/.test(n)) return { category: "CONVENTIONS_BAILLEURS", type: "CONTRAT" };
  if (/attestation|lettre.+satisfaction/.test(n)) return { category: "CONVENTIONS_BAILLEURS", type: "AUTRE" };
  if (/budget|fla/.test(n)) return { category: "MODELES_AO", type: "BUDGET" };
  if (/tdr|terme.+reference|concept.note|appel/.test(n)) return { category: "MODELES_AO", type: "TDR" };
  if (/cv[ _-]/.test(n) || n.startsWith("cv ")) return { category: "AUTRE", type: "AUTRE" };
  if (/\.(jpg|jpeg|png|webp|gif|heic)$/.test(n)) return { category: "MEDIAS_TERRAIN", type: "PHOTO_TERRAIN" };
  return { category: "AUTRE", type: "AUTRE" };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Métadonnées éditables par fichier (chaque ligne dans la liste). */
interface FileEntry {
  id: string;
  file: File;
  nom: string;
  category: string;
  type: string;
  /** "pending" tant qu'on n'a pas commencé ; "uploading" pendant ; "done" / "error" après */
  status: "pending" | "uploading" | "done" | "error";
  /** 0–100 — réel via XHR.upload.onprogress */
  progress: number;
  errorMsg?: string;
}

export function DocumentUploader({
  projetId,
  opportuniteId,
  candidatureId,
  pieceId,
  appelOffreId,
  fournisseurId,
  soumissionId,
  defaultCategory = "AUTRE",
  defaultType = "AUTRE",
  defaultVisibility = "INTERNE",
  buttonLabel = "Téléverser un document",
  compact = false,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [visibility, setVisibility] = useState<"INTERNE" | "CONFIDENTIEL">(
    defaultVisibility === "CONFIDENTIEL" ? "CONFIDENTIEL" : "INTERNE",
  );
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isUploading = entries.some((e) => e.status === "uploading");
  const anyDone = entries.some((e) => e.status === "done");

  // Drag & drop sur la dropzone du modal
  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      setGlobalError(null);
      const arr = Array.from(incoming);
      const valid: FileEntry[] = [];
      let rejected = 0;
      for (const f of arr) {
        if (f.size > MAX_SIZE) { rejected++; continue; }
        const auto = autoCategorize(f.name);
        valid.push({
          id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          nom: f.name.replace(/\.[^.]+$/, ""),
          category: defaultCategory !== "AUTRE" ? defaultCategory : auto.category,
          type: defaultType !== "AUTRE" ? defaultType : auto.type,
          status: "pending",
          progress: 0,
        });
      }
      setEntries((prev) => [...prev, ...valid]);
      if (rejected > 0) {
        setGlobalError(`${rejected} fichier${rejected > 1 ? "s" : ""} dépassent la limite de ${formatSize(MAX_SIZE)} et ${rejected > 1 ? "ont été ignorés" : "a été ignoré"}.`);
      }
    },
    [defaultCategory, defaultType],
  );

  // Ouverture par drag externe (sur la page hôte) — exposé via évènement global
  useEffect(() => {
    const onOpenWithFiles = (e: Event) => {
      const ce = e as CustomEvent<{ files: File[] }>;
      if (!ce.detail?.files?.length) return;
      setOpen(true);
      handleFiles(ce.detail.files);
    };
    window.addEventListener("chadia:uploader-open", onOpenWithFiles);
    return () => window.removeEventListener("chadia:uploader-open", onOpenWithFiles);
  }, [handleFiles]);

  function reset() {
    setEntries([]);
    setDescription("");
    setTags("");
    setGlobalError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  /** Upload UN fichier via XHR pour avoir la vraie progression. */
  function uploadOne(entry: FileEntry): Promise<void> {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("file", entry.file);
      fd.append("nom", entry.nom || entry.file.name);
      fd.append("type", entry.type);
      fd.append("category", entry.category);
      fd.append("visibility", visibility);
      if (description) fd.append("description", description);
      if (tags) fd.append("tags", tags);
      if (projetId) fd.append("projetId", projetId);
      if (opportuniteId) fd.append("opportuniteId", opportuniteId);
      if (candidatureId) fd.append("candidatureId", candidatureId);
      if (pieceId) fd.append("pieceId", pieceId);
      if (appelOffreId) fd.append("appelOffreId", appelOffreId);
      if (fournisseurId) fd.append("fournisseurId", fournisseurId);
      if (soumissionId) fd.append("soumissionId", soumissionId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/documents/upload", true);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          updateEntry(entry.id, { status: "uploading", progress: pct });
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateEntry(entry.id, { status: "done", progress: 100 });
        } else {
          let msg = `Erreur HTTP ${xhr.status}`;
          try { const err = JSON.parse(xhr.responseText); if (err.error) msg = err.error; } catch { /* ignore */ }
          updateEntry(entry.id, { status: "error", errorMsg: msg });
        }
        resolve();
      };
      xhr.onerror = () => {
        updateEntry(entry.id, { status: "error", errorMsg: "Connexion interrompue" });
        resolve();
      };
      updateEntry(entry.id, { status: "uploading", progress: 0 });
      xhr.send(fd);
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    const pending = entries.filter((e) => e.status === "pending" || e.status === "error");
    if (pending.length === 0) {
      setGlobalError("Aucun fichier à téléverser.");
      return;
    }

    // Upload en parallèle (3 simultanés max pour ne pas saturer le tender).
    const concurrency = 3;
    const queue = [...pending];
    const inFlight: Promise<void>[] = [];
    while (queue.length > 0 || inFlight.length > 0) {
      while (inFlight.length < concurrency && queue.length > 0) {
        const next = queue.shift()!;
        const p = uploadOne(next).finally(() => {
          const idx = inFlight.indexOf(p);
          if (idx >= 0) inFlight.splice(idx, 1);
        });
        inFlight.push(p);
      }
      await Promise.race(inFlight);
    }

    // Si au moins un upload a réussi, refresh la page pour montrer les nouveaux docs.
    if (entries.some((x) => x.status === "done")) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  // Bouton déclencheur (rendu quand le modal est fermé)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn ${compact ? "btn--ghost btn--sm" : "btn--accent"}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <i className="ph ph-upload"></i> {buttonLabel}
      </button>
    );
  }

  return (
    <Dialog open={open} onClose={() => { if (!isUploading) { setOpen(false); reset(); } }} title="Téléverser un document" maxWidth={700} preventClose={isUploading}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--color-line)" }}>
          <i className="ph ph-cloud-arrow-up" style={{ fontSize: 22, color: "var(--color-terracotta)" }} aria-hidden="true"></i>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink)" }}>
              Téléverser des documents
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
              {entries.length === 0 ? "Aucun fichier sélectionné" : `${entries.length} fichier${entries.length > 1 ? "s" : ""} · ${formatSize(entries.reduce((s, e) => s + e.file.size, 0))}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (!isUploading) { setOpen(false); reset(); } }}
            disabled={isUploading}
            aria-label="Fermer"
            className="btn btn--ghost btn--sm"
            style={{ height: 32, width: 32, padding: 0, display: "grid", placeItems: "center" }}
          >
            <i className="ph ph-x" aria-hidden="true"></i>
          </button>
        </header>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Dropzone */}
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              display: "block",
              padding: entries.length > 0 ? 16 : 28,
              border: `2px dashed ${dragOver ? "var(--color-terracotta)" : "var(--color-line-strong)"}`,
              borderRadius: 8,
              background: dragOver ? "var(--color-terracotta-soft)" : "var(--color-canvas)",
              textAlign: "center",
              cursor: "pointer",
              transition: "all var(--dur-fast) var(--ease-out)",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
            <i className="ph ph-cloud-arrow-up" style={{ fontSize: entries.length > 0 ? 22 : 36, color: dragOver ? "var(--color-terracotta)" : "var(--color-stone)" }}></i>
            <div style={{ marginTop: 6, fontSize: 13 }}>
              <strong>Cliquez ici</strong> ou glissez {entries.length > 0 ? "d'autres fichiers" : "des fichiers"}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 2 }}>
              PDF, DOCX, XLSX, images, ZIP · 10 Mo max par fichier · plusieurs fichiers possibles
            </div>
          </label>

          {/* Liste des fichiers à uploader */}
          {entries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((entry) => (
                <FileRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={(patch) => updateEntry(entry.id, patch)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
          ) : null}

          {/* Métadonnées globales (visibilité + description + tags) */}
          {entries.length > 0 ? (
            <details style={{ background: "var(--color-canvas)", border: "1px solid var(--color-line)", borderRadius: 6 }}>
              <summary style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", color: "var(--color-sepia)", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ph ph-caret-right" aria-hidden="true"></i>
                Options · visibilité, description, étiquettes (appliquées à tous les fichiers)
              </summary>
              <div style={{ padding: "8px 12px 12px", display: "grid", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-stone)", marginBottom: 4 }}>Visibilité</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["INTERNE", "CONFIDENTIEL"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        className="pill"
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          background: visibility === v ? (v === "CONFIDENTIEL" ? "var(--color-danger-soft)" : "var(--color-success-soft)") : "var(--color-surface)",
                          color: visibility === v ? (v === "CONFIDENTIEL" ? "var(--color-danger)" : "var(--color-success)") : "var(--color-ink)",
                          border: "1px solid var(--color-line)",
                          cursor: "pointer",
                        }}
                      >
                        <i className={v === "CONFIDENTIEL" ? "ph ph-lock" : "ph ph-users-three"} aria-hidden="true"></i> {v === "CONFIDENTIEL" ? "Confidentiel · direction" : "Interne · tous"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-stone)", marginBottom: 4 }}>Description <small>(optionnel)</small></label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Contexte, observations, lien avec un projet…"
                    style={{ width: "100%", padding: 8, fontSize: 12, border: "1px solid var(--color-line)", borderRadius: 4, fontFamily: "inherit", resize: "vertical" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-stone)", marginBottom: 4 }}>Étiquettes <small>(séparées par virgule)</small></label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="urgent, terrain, 2026"
                    style={{ width: "100%", padding: 8, fontSize: 12, border: "1px solid var(--color-line)", borderRadius: 4, fontFamily: "inherit" }}
                  />
                </div>
              </div>
            </details>
          ) : null}

          {globalError ? (
            <div style={{ padding: 10, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderRadius: 6, fontSize: 12 }}>
              <i className="ph ph-warning-circle" aria-hidden="true"></i> {globalError}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <footer style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid var(--color-line)", background: "var(--color-canvas)" }}>
          {anyDone && !isUploading ? (
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              className="btn btn--ghost btn--sm"
            >
              Fermer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { if (!isUploading) { setOpen(false); reset(); } }}
              disabled={isUploading}
              className="btn btn--ghost btn--sm"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={entries.length === 0 || isUploading || isPending || entries.every((e) => e.status === "done")}
            className="btn btn--accent btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {isUploading ? (
              <>
                <i className="ph ph-circle-notch" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true"></i>
                Envoi en cours…
              </>
            ) : (
              <>
                <i className="ph ph-cloud-arrow-up" aria-hidden="true"></i>
                Téléverser {entries.length > 0 ? `(${entries.filter((e) => e.status === "pending" || e.status === "error").length})` : ""}
              </>
            )}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

/** Ligne d'un fichier dans la liste — affiche nom, catégorie, type, statut, progress. */
function FileRow({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: FileEntry;
  onUpdate: (patch: Partial<FileEntry>) => void;
  onRemove: () => void;
}) {
  const isDone = entry.status === "done";
  const isError = entry.status === "error";
  const isUploading = entry.status === "uploading";

  return (
    <div
      style={{
        border: `1px solid ${isError ? "rgba(163,45,45,0.3)" : isDone ? "rgba(91,138,58,0.3)" : "var(--color-line)"}`,
        borderRadius: 8,
        padding: 10,
        background: isError ? "var(--color-danger-soft)" : isDone ? "var(--color-success-soft)" : "var(--color-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <i
          className={`ph ${isDone ? "ph-check-circle" : isError ? "ph-x-circle" : "ph-file"}`}
          style={{ fontSize: 22, color: isDone ? "var(--color-success)" : isError ? "var(--color-danger)" : "var(--color-stone)", flexShrink: 0, marginTop: 2 }}
        ></i>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={entry.nom}
            onChange={(e) => onUpdate({ nom: e.target.value })}
            disabled={isUploading || isDone}
            style={{
              width: "100%",
              padding: "2px 4px",
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid transparent",
              background: "transparent",
              borderRadius: 3,
              fontFamily: "inherit",
              color: "var(--color-ink)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-line-strong)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            title="Nom affiché"
          />
          <div style={{ fontSize: 10, color: "var(--color-stone)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {entry.file.name} · {formatSize(entry.file.size)}
            {isError && entry.errorMsg ? <span style={{ color: "var(--color-danger)", marginLeft: 6 }}>· {entry.errorMsg}</span> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={isUploading}
          aria-label="Retirer ce fichier"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-stone)",
            fontSize: 16,
            opacity: isUploading ? 0.3 : 1,
          }}
        >
          <i className="ph ph-x" aria-hidden="true"></i>
        </button>
      </div>

      {/* Edition catégorie/type (seulement avant upload) */}
      {!isDone ? (
        <div style={{ display: "flex", gap: 6, paddingLeft: 32 }}>
          <select
            value={entry.category}
            onChange={(e) => onUpdate({ category: e.target.value })}
            disabled={isUploading}
            style={{ fontSize: 11, padding: "3px 6px", border: "1px solid var(--color-line)", borderRadius: 4, background: "var(--color-page)", color: "var(--color-ink)", fontFamily: "inherit" }}
          >
            {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <select
            value={entry.type}
            onChange={(e) => onUpdate({ type: e.target.value })}
            disabled={isUploading}
            style={{ fontSize: 11, padding: "3px 6px", border: "1px solid var(--color-line)", borderRadius: 4, background: "var(--color-page)", color: "var(--color-ink)", fontFamily: "inherit" }}
          >
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
      ) : null}

      {/* Barre de progression réelle (uniquement pendant upload) */}
      {isUploading ? (
        <div style={{ marginLeft: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-stone)", marginBottom: 3 }}>
            <span>Envoi…</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{entry.progress}%</span>
          </div>
          <div style={{ height: 4, background: "var(--color-canvas)", borderRadius: 2, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${entry.progress}%`, background: "var(--color-terracotta)", transition: "width 200ms ease-out" }}></span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
