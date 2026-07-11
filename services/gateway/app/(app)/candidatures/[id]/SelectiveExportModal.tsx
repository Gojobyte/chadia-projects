"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";

interface DocLight {
  id: string;
  nom: string;
  category: string;
  mimeType?: string | null;
  taille?: number | null;
}

interface Props {
  candidatureId: string;
  candidatureRef: string;
  documents: DocLight[];
}

/**
 * Bouton "Export sélectif" qui ouvre une modal listant les documents
 * avec des checkboxes. Le ZIP est généré côté serveur avec uniquement
 * les documents sélectionnés (query `?docs=id1,id2`).
 * Pour V1 on inclut TOUT par défaut, l'utilisateur décoche ce qu'il ne
 * veut pas envoyer (workflow plus naturel pour les ONG qui veulent
 * souvent retirer un brouillon non finalisé).
 */
export function SelectiveExportModal({ candidatureId, candidatureRef, documents }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(documents.map((d) => d.id)));

  const allSelected = selected.size === documents.length;
  const noneSelected = selected.size === 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(documents.map((d) => d.id)));
  }

  const downloadUrl = `/api/tender/candidatures/${candidatureId}/export.zip?docs=${encodeURIComponent(
    [...selected].join(","),
  )}`;

  // Groupage par catégorie pour l'affichage
  const byCat = documents.reduce<Record<string, DocLight[]>>((acc, d) => {
    const cat = d.category || "AUTRE";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="io-btn"
        disabled={documents.length === 0}
        title={documents.length === 0 ? "Aucun document à exporter" : "Choisir les documents à inclure dans le ZIP"}
      >
        <i className="ph ph-package" aria-hidden="true"></i> Export sélectif
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Export partiel ${candidatureRef} — choisir les documents`}
        maxWidth={620}
      >
            <header style={{
              padding: "16px 20px", borderBottom: "1px solid var(--color-line)",
              background: "var(--color-surface-2)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
                  Export partiel · {candidatureRef}
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "var(--color-ink)", margin: 0, lineHeight: 1.1 }}>
                  Choisir les <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>documents</em> à inclure
                </h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn btn--ghost btn--sm">
                <i className="ph ph-x" aria-hidden="true"></i>
              </button>
            </header>

            <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--color-line)", display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-shale)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
                  onChange={toggleAll}
                />
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </label>
              <span style={{ color: "var(--color-stone)", fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
                {selected.size} / {documents.length} document{documents.length > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
              {documents.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-stone)", textAlign: "center", margin: 0 }}>
                  Aucun document joint à cette candidature pour l&apos;instant.
                </p>
              ) : (
                Object.entries(byCat).map(([cat, docs]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-mineral)", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                      {cat.replace(/_/g, " ").toLowerCase()}
                      <span style={{ marginLeft: 6, color: "var(--color-stone)", fontFamily: "var(--font-mono)", letterSpacing: 0 }}>
                        ({docs.filter((d) => selected.has(d.id)).length}/{docs.length})
                      </span>
                    </div>
                    {docs.map((d) => (
                      <label
                        key={d.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px",
                          background: selected.has(d.id) ? "var(--color-terracotta-soft)" : "var(--color-page)",
                          border: "1px solid " + (selected.has(d.id) ? "var(--color-terracotta-line)" : "var(--color-line)"),
                          borderRadius: 6,
                          marginBottom: 4,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(d.id)}
                          onChange={() => toggle(d.id)}
                        />
                        <span style={{ flex: 1, color: "var(--color-ink)" }}>{d.nom}</span>
                        {d.taille ? (
                          <span style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
                            {d.taille < 1024 * 1024 ? `${(d.taille / 1024).toFixed(0)} Ko` : `${(d.taille / 1024 / 1024).toFixed(1)} Mo`}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-line)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setOpen(false)} className="btn btn--ghost btn--sm">
                Annuler
              </button>
              <a
                href={selected.size > 0 ? downloadUrl : "#"}
                download
                onClick={(e) => {
                  if (selected.size === 0) {
                    e.preventDefault();
                    return;
                  }
                  // Le navigateur déclenche le download via l'attribut download.
                  // On ferme la modal après un court délai pour laisser le download
                  // commencer.
                  setTimeout(() => setOpen(false), 200);
                }}
                aria-disabled={selected.size === 0}
                className="btn btn--accent btn--sm"
                style={{
                  opacity: selected.size === 0 ? 0.5 : 1,
                  pointerEvents: selected.size === 0 ? "none" : undefined,
                }}
              >
                <i className="ph ph-download-simple" aria-hidden="true"></i>
                Télécharger ({selected.size})
              </a>
            </div>
      </Dialog>
    </>
  );
}
