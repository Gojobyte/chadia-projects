"use client";

import { useState, useTransition } from "react";

interface Props {
  projetRef: string;
  projetTitre: string;
  deleteAction: () => Promise<void>;
}

export function DeleteProjetButton({ projetRef, projetTitre, deleteAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      try {
        await deleteAction();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Erreur de suppression");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="btn btn--danger btn--sm"
        title="Supprimer définitivement le projet"
      >
        <i className="ph ph-trash" aria-hidden="true"></i> {pending ? "Suppression…" : "Supprimer"}
      </button>

      {confirmOpen ? (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
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
                Supprimer <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>{projetRef}</em> ?
              </h4>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-shale)", lineHeight: 1.5, margin: "0 0 8px" }}>
              Vous êtes sur le point de supprimer définitivement le projet :
            </p>
            <p style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500, margin: "0 0 14px", padding: "8px 12px", background: "var(--color-canvas)", borderRadius: 6 }}>
              {projetTitre}
            </p>
            <p style={{ fontSize: 12, color: "var(--color-stone)", lineHeight: 1.5, margin: "0 0 16px" }}>
              Cette action est <strong>irréversible</strong>. Les documents rattachés au projet seront détachés (orphelins en bibliothèque) mais pas supprimés.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setConfirmOpen(false)} className="btn btn--ghost btn--sm" disabled={pending}>
                Annuler
              </button>
              <button type="button" onClick={handleConfirm} className="btn btn--danger btn--sm" disabled={pending}>
                {pending ? "Suppression…" : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
