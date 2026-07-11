"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";

export type PieceCategorie = "A" | "B" | "C" | "D" | "E";

export interface Piece {
  id: string;
  nom: string;
  description?: string | null;
  categorie: PieceCategorie;
  type?: string;
  obligatoire?: boolean;
  format?: string;
}

interface Props {
  mode: "add" | "edit";
  piece?: Piece;
  defaultCategorie?: PieceCategorie;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Modal réutilisable pour créer ou modifier une pièce requise dans
 * l'arborescence du dossier. Mode `add` montre un formulaire vide,
 * mode `edit` pré-remplit avec la pièce passée.
 *
 * Le `<form onSubmit>` côté client appelle le Server Action passé en
 * prop. Pendant le pending, le formulaire est désactivé et le bouton
 * affiche "Enregistrement…".
 */
export function PieceEditModal({
  mode,
  piece,
  defaultCategorie,
  onClose,
  onSubmit,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    onSubmit(fd)
      .then((res) => {
        if (!res.ok) setError(res.error || "Erreur");
      })
      .finally(() => setPending(false));
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      title={mode === "add" ? "Ajouter une pièce" : "Modifier la pièce"}
      maxWidth={540}
      preventClose={pending}
    >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-line)",
            background: "var(--color-surface-2)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "var(--color-stone)",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {mode === "add" ? "Nouvelle pièce" : "Édition pièce"}
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 400,
                color: "var(--color-ink)",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {mode === "add" ? (
                <>
                  Ajouter une{" "}
                  <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>pièce</em>
                </>
              ) : (
                <>
                  Modifier{" "}
                  <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>
                    {piece?.nom}
                  </em>
                </>
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            disabled={pending}
          >
            <i className="ph ph-x" aria-hidden="true"></i>
          </button>
        </header>

        <form
          onSubmit={submit}
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflowY: "auto",
          }}
        >
          <div className="form-grid">
            <div className="field-uc span-2">
              <span className="label">Nom de la pièce</span>
              <input
                className="input"
                name="nom"
                defaultValue={piece?.nom ?? ""}
                placeholder="Ex. Note de cadrage stratégique"
                required
                autoFocus
              />
            </div>
            <div className="field-uc span-2">
              <span className="label">Description</span>
              <textarea
                name="description"
                defaultValue={piece?.description ?? ""}
                rows={2}
                placeholder="Ce que le bailleur attend exactement dans cette pièce"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--color-ink)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line-strong)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  width: "100%",
                  resize: "vertical",
                  minHeight: 60,
                  lineHeight: 1.55,
                }}
              />
            </div>
            <div className="field-uc">
              <span className="label">Catégorie</span>
              <select
                className="input"
                name="categorie"
                defaultValue={piece?.categorie ?? defaultCategorie ?? "E"}
              >
                <option value="A">A · Pièces administratives</option>
                <option value="B">B · Capacité technique</option>
                <option value="C">C · Note méthodologique</option>
                <option value="D">D · Budget & ressources</option>
                <option value="E">E · Équipe & annexes</option>
              </select>
            </div>
            <div className="field-uc">
              <span className="label">Type</span>
              <select className="input" name="type" defaultValue={piece?.type ?? "ANNEXE"}>
                <option value="ADMIN">Administrative</option>
                <option value="TECHNIQUE">Technique</option>
                <option value="FINANCIER">Financière</option>
                <option value="ANNEXE">Annexe</option>
              </select>
            </div>
            <div className="field-uc">
              <span className="label">Format attendu</span>
              <select className="input" name="format" defaultValue={piece?.format ?? "DOCX"}>
                <option value="PDF">PDF</option>
                <option value="DOCX">DOCX (Word)</option>
                <option value="XLSX">XLSX (Excel)</option>
                <option value="LIBRE">Libre</option>
              </select>
            </div>
            <div className="field-uc">
              <span className="label">Obligatoire ?</span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--color-sepia)",
                  paddingTop: 8,
                }}
              >
                <input
                  type="checkbox"
                  name="obligatoire"
                  defaultChecked={piece?.obligatoire !== false}
                />
                Pièce obligatoire pour le dépôt
              </label>
            </div>
          </div>

          {error ? (
            <div
              style={{
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                border: "1px solid rgba(163,45,45,0.18)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
              }}
            >
              <i className="ph ph-warning-circle" aria-hidden="true"></i> {error}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              paddingTop: 10,
              borderTop: "1px solid var(--color-line)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn--ghost btn--sm"
              disabled={pending}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn--accent btn--sm" disabled={pending}>
              {pending ? (
                "Enregistrement…"
              ) : mode === "add" ? (
                <>
                  <i className="ph ph-plus" aria-hidden="true"></i> Ajouter
                </>
              ) : (
                <>
                  <i className="ph ph-floppy-disk" aria-hidden="true"></i> Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
    </Dialog>
  );
}
