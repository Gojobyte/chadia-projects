"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** ID auquel rattacher le document (au moins un parmi ces 4) */
  projetId?: string;
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
  { v: "MODELES_AO", l: "Modèles d'AO" },
  { v: "STATUTS_JURIDIQUE", l: "Statuts & juridique" },
  { v: "PROJETS", l: "Projets" },
  { v: "CONVENTIONS_BAILLEURS", l: "Conventions bailleurs" },
  { v: "COMPTABILITE", l: "Comptabilité" },
  { v: "MEDIAS_TERRAIN", l: "Médias terrain" },
  { v: "RAPPORTS", l: "Rapports" },
  { v: "AUTRE", l: "Autre" },
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

export function DocumentUploader({
  projetId,
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
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Aucun fichier sélectionné");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 MB)");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("nom", (form.elements.namedItem("nom") as HTMLInputElement)?.value || file.name);
    fd.append("type", (form.elements.namedItem("type") as HTMLSelectElement)?.value || defaultType);
    fd.append("category", (form.elements.namedItem("category") as HTMLSelectElement)?.value || defaultCategory);
    fd.append("visibility", (form.elements.namedItem("visibility") as HTMLSelectElement)?.value || defaultVisibility);
    const desc = (form.elements.namedItem("description") as HTMLTextAreaElement)?.value;
    if (desc) fd.append("description", desc);
    const tags = (form.elements.namedItem("tags") as HTMLInputElement)?.value;
    if (tags) fd.append("tags", tags);
    if (projetId) fd.append("projetId", projetId);
    if (appelOffreId) fd.append("appelOffreId", appelOffreId);
    if (fournisseurId) fd.append("fournisseurId", fournisseurId);
    if (soumissionId) fd.append("soumissionId", soumissionId);

    setProgress(10);
    try {
      const resp = await fetch("/api/tender/documents/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      setProgress(90);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur upload" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      setProgress(100);
      startTransition(() => {
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 500);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setProgress(0);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn ${compact ? "btn--ghost btn--sm" : "btn--accent"}`}
      >
        <i className="ph ph-upload"></i> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="doc-uploader" style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-line)",
      borderRadius: 8,
      padding: 24,
      maxWidth: 640,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, margin: 0 }}>
          Téléverser <em style={{ color: "var(--color-terracotta)" }}>un document</em>
        </h3>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-stone)", fontSize: 20 }}
        >
          <i className="ph ph-x"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Drop zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            display: "block",
            padding: 32,
            border: `2px dashed ${dragOver ? "var(--color-terracotta)" : "var(--color-line-strong)"}`,
            borderRadius: 6,
            background: dragOver ? "var(--color-terracotta-soft)" : "var(--color-canvas)",
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color var(--dur-fast) var(--ease-out)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />
          {file ? (
            <div>
              <i className="ph ph-file-check" style={{ fontSize: 32, color: "var(--color-success)" }}></i>
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 13 }}>
                <strong>{file.name}</strong>
                <div style={{ color: "var(--color-stone)", fontSize: 11 }}>
                  {(file.size / 1024).toFixed(1)} Ko · {file.type || "type inconnu"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => reset()}
                style={{ marginTop: 12, background: "transparent", border: "none", color: "var(--color-terracotta)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
              >
                Choisir un autre fichier
              </button>
            </div>
          ) : (
            <div>
              <i className="ph ph-cloud-arrow-up" style={{ fontSize: 32, color: "var(--color-stone)" }}></i>
              <div style={{ marginTop: 8, fontSize: 14 }}>
                <strong>Cliquez ici</strong> ou glissez un fichier
              </div>
              <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 4 }}>
                PDF, DOCX, XLSX, PNG, JPG, ZIP — 10 MB max
              </div>
            </div>
          )}
        </label>

        {/* Metadata */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Nom affiché <span style={{ color: "var(--color-terracotta)" }}>*</span></label>
            <input name="nom" defaultValue={file?.name ?? ""} required />
          </div>
          <div className="field">
            <label>Type</label>
            <select name="type" defaultValue={defaultType}>
              {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Catégorie</label>
            <select name="category" defaultValue={defaultCategory}>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Visibilité</label>
            <select name="visibility" defaultValue={defaultVisibility}>
              <option value="PUBLIC">Public</option>
              <option value="INTERNE">Interne</option>
              <option value="CONFIDENTIEL">Confidentiel</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Description <small>(optionnel)</small></label>
            <textarea name="description" rows={2} placeholder="Contexte, observations, lien avec le projet…"></textarea>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Étiquettes <small>séparées par virgule</small></label>
            <input name="tags" placeholder="urgence, terrain, 2026" />
          </div>
        </div>

        {/* Progress / error */}
        {progress > 0 && (
          <div style={{ height: 4, background: "var(--color-canvas)", borderRadius: 2, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${progress}%`, background: "var(--color-terracotta)", transition: "width 200ms ease-out" }}></span>
          </div>
        )}
        {error && (
          <div style={{ padding: 12, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderRadius: 4, fontSize: 13 }}>
            <i className="ph ph-warning-circle" style={{ marginRight: 6 }}></i>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => { setOpen(false); reset(); }}
            className="btn btn--ghost btn--sm"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!file || isPending || progress > 0}
            className="btn btn--accent btn--sm"
          >
            {isPending || progress > 0 ? (
              <>
                <i className="ph ph-circle-notch"></i> Envoi en cours…
              </>
            ) : (
              <>
                <i className="ph ph-cloud-arrow-up"></i> Téléverser
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
