"use client";

import { useState } from "react";

type Section = "contexte" | "pertinence" | "methodologie" | "genre" | "calendrier";

interface Props {
  candidatureId: string;
  section: Section;
  /** name HTML utilisé dans la FormData du form parent (ex: "noteConcept") */
  name: string;
  /** Valeur initiale du textarea (server-rendered) */
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  /** Désactive l'édition (mode lecture seule selon le rôle) */
  disabled?: boolean;
  /** Label affiché à côté du bouton (ex: "section 3.1 · contexte") */
  buttonLabel?: string;
}

/**
 * Textarea qui permet de demander un brouillon Mistral.
 *
 * Le textarea reste contrôlé en local pour qu'on puisse y injecter le
 * brouillon généré. Comme le composant reste dans le `<form>` du parent
 * (Server Action), la valeur courante est bien envoyée à la soumission.
 *
 * Politique :
 *  - On NE remplace JAMAIS un texte existant sans confirmation.
 *  - Si le textarea est vide → on insère directement le brouillon.
 *  - Sinon → on affiche une bannière permettant Remplacer / Ajouter au‑dessous / Annuler.
 */
export function AIDraftableTextarea({
  candidatureId,
  section,
  name,
  defaultValue = "",
  rows = 5,
  placeholder,
  disabled,
  buttonLabel = "Brouillon IA",
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<string | null>(null);

  async function fetchDraft() {
    setError(null);
    setPending(true);
    try {
      const resp = await fetch(`/api/tender/candidatures/${candidatureId}/draft/${section}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const draftText: string = data.text || "";
      if (!draftText) throw new Error("Le brouillon est vide");

      // Si le textarea est vide, on insère directement.
      // Sinon, on demande confirmation via la bannière.
      if (value.trim().length === 0) {
        setValue(draftText);
      } else {
        setPendingDraft(draftText);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur Mistral");
    } finally {
      setPending(false);
    }
  }

  function replaceWithDraft() {
    if (!pendingDraft) return;
    setValue(pendingDraft);
    setPendingDraft(null);
  }
  function appendDraft() {
    if (!pendingDraft) return;
    setValue((v) => (v.trim() ? `${v.trim()}\n\n${pendingDraft}` : pendingDraft));
    setPendingDraft(null);
  }
  function cancelDraft() {
    setPendingDraft(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        className="textarea"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Barre d'action en bas du textarea */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: "var(--color-stone)",
        }}
      >
        <button
          type="button"
          onClick={fetchDraft}
          disabled={disabled || pending}
          className="btn btn--ghost btn--sm"
          style={{
            color: "var(--color-terracotta)",
            padding: "4px 10px",
            height: 26,
            fontSize: 11,
          }}
          title="Générer un brouillon à partir de l'analyse Mistral de l'AO"
        >
          {pending ? (
            <>
              <i className="ph ph-circle-notch" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true"></i>
              Rédaction en cours…
            </>
          ) : (
            <>
              <i className="ph-fill ph-sparkle" aria-hidden="true"></i>
              {buttonLabel}
            </>
          )}
        </button>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
          {value.length} caractère{value.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Erreur */}
      {error ? (
        <div
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            border: "1px solid rgba(163,45,45,0.18)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="ph ph-warning-circle" aria-hidden="true"></i>
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}
          >
            <i className="ph ph-x"></i>
          </button>
        </div>
      ) : null}

      {/* Brouillon généré, en attente de confirmation */}
      {pendingDraft ? (
        <div
          style={{
            background: "var(--color-terracotta-soft)",
            border: "1px solid var(--color-terracotta-line)",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <i className="ph-fill ph-sparkle" style={{ color: "var(--color-terracotta)" }} aria-hidden="true"></i>
            <strong style={{ fontSize: 12, color: "var(--color-terracotta-press)" }}>
              Brouillon Mistral · {pendingDraft.split(/\s+/).length} mots
            </strong>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-shale)" }}>
              Un texte existe déjà — choisis comment l&apos;intégrer
            </span>
          </div>
          <div
            style={{
              background: "var(--color-page)",
              border: "1px solid var(--color-line)",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 13,
              color: "var(--color-sepia)",
              maxHeight: 200,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              lineHeight: 1.55,
              marginBottom: 10,
            }}
          >
            {pendingDraft}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" onClick={cancelDraft} className="btn btn--ghost btn--sm">
              Annuler
            </button>
            <button type="button" onClick={appendDraft} className="btn btn--secondary btn--sm">
              <i className="ph ph-plus" aria-hidden="true"></i> Ajouter au-dessous
            </button>
            <button type="button" onClick={replaceWithDraft} className="btn btn--accent btn--sm">
              <i className="ph ph-arrow-clockwise" aria-hidden="true"></i> Remplacer
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
