"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import { deduireCategoriesPourCritere } from "./scoring-utils";

interface Critere {
  label: string;
  description?: string;
  ponderation: number;
  score: number;
  bar: number;
}

interface PieceSummary {
  id: string;
  nom: string;
  categorie: "A" | "B" | "C" | "D" | "E";
  status?: "ok" | "draft" | "miss" | "ai";
  obligatoire?: boolean;
}

interface Props {
  criteres: Critere[];
  pieces: PieceSummary[];
  scoreTotal: number;
  scoreMax: number;
  /** Mapping critère → catégorie A-E des pièces qui contribuent au score.
   *  Si pas fourni, on déduit du label (heuristique). */
  critereToCatList?: Record<string, Array<"A" | "B" | "C" | "D" | "E">>;
}

// deduireCategoriesPourCritere : maintenant importé depuis scoring-utils.ts
// pour éviter la duplication avec page.tsx (audit Sprint 3 P1-3).

// Génère des actions concrètes pour gagner des points sur un critère.
// V1 : heuristique sans appel IA — chaque pièce manquante = action proposée.
function genererActions(critere: Critere, pieces: PieceSummary[]): Array<{ icon: string; text: string; gain: number }> {
  const cats = deduireCategoriesPourCritere(critere.label);
  const actions: Array<{ icon: string; text: string; gain: number }> = [];

  const piecesPertinentes = pieces.filter((p) => cats.includes(p.categorie));
  const manquantes = piecesPertinentes.filter((p) => p.status === "miss" && p.obligatoire !== false);
  const brouillons = piecesPertinentes.filter((p) => p.status === "draft");

  // Gain estimé par pièce complétée — proportionnel à la pondération.
  const gainParPiece = piecesPertinentes.length > 0
    ? Math.max(1, Math.round((critere.ponderation - critere.score) / piecesPertinentes.length))
    : 1;

  for (const p of manquantes.slice(0, 4)) {
    actions.push({
      icon: "ph ph-upload-simple",
      text: `Téléverser ${p.nom}`,
      gain: gainParPiece,
    });
  }
  for (const p of brouillons.slice(0, 3)) {
    actions.push({
      icon: "ph ph-check-circle",
      text: `Finaliser le brouillon : ${p.nom}`,
      gain: Math.max(1, Math.round(gainParPiece / 2)),
    });
  }
  // Actions génériques selon le critère
  const l = critere.label.toLowerCase();
  if (/pertinence/.test(l)) {
    actions.push({
      icon: "ph ph-lightbulb",
      text: "Citer explicitement les axes stratégiques du bailleur dans la note méthodologique",
      gain: 3,
    });
  }
  if (/m[ée]thodologie/.test(l)) {
    actions.push({
      icon: "ph ph-list-checks",
      text: "Ajouter les indicateurs SMART au cadre logique",
      gain: 4,
    });
    actions.push({
      icon: "ph ph-clock",
      text: "Détailler le calendrier des phases (M1-M9)",
      gain: 2,
    });
  }
  if (/budget|co[ûu]t/.test(l)) {
    actions.push({
      icon: "ph ph-coins",
      text: "Justifier ligne par ligne les coûts indirects (plafond 7 %)",
      gain: 3,
    });
  }
  if (/durabilit/.test(l)) {
    actions.push({
      icon: "ph ph-handshake",
      text: "Décrire la stratégie de transfert aux comités villageois",
      gain: 4,
    });
  }
  if (/genre|inclusion/.test(l)) {
    actions.push({
      icon: "ph ph-users",
      text: "Ajouter un protocole VBG et un référent·e genre certifié·e",
      gain: 5,
    });
  }

  // Limiter à 6 actions, trier par gain décroissant
  return actions.sort((a, b) => b.gain - a.gain).slice(0, 6);
}

export function ScoreDetailModal({ criteres, pieces, scoreTotal, scoreMax }: Props) {
  const [openCritere, setOpenCritere] = useState<Critere | null>(null);

  return (
    <>
      {/* Le composant rend lui-même la grille pour pouvoir intercepter les clics.
          On ne re-render pas la grille parent — la page reste responsable de
          l'AFFICHAGE des critères, on ajoute juste un bouton "Voir le détail"
          qui ouvre la modal via state. */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setOpenCritere(criteres[0] ?? null)}
          className="btn btn--ghost btn--sm"
          disabled={criteres.length === 0}
          title="Voir le détail de chaque critère et les actions pour gagner des points"
          style={{ color: "var(--color-terracotta)" }}
        >
          <i className="ph ph-info" aria-hidden="true"></i> Détail & actions pour améliorer le score
        </button>
      </div>

      <Dialog
        open={openCritere !== null}
        onClose={() => setOpenCritere(null)}
        title="Détail des critères d'évaluation et actions d'amélioration"
        maxWidth={820}
      >
        {openCritere ? (<>
            <header style={{
              padding: "16px 20px", borderBottom: "1px solid var(--color-line)",
              background: "var(--color-surface-2)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
                  Grille d&apos;évaluation · {scoreTotal} / {scoreMax} pts
                </div>
                <h3 style={{
                  fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400,
                  color: "var(--color-ink)", margin: 0, lineHeight: 1.1,
                }}>
                  Détail des <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>critères</em> &amp; actions
                </h3>
              </div>
              <button type="button" onClick={() => setOpenCritere(null)} className="btn btn--ghost btn--sm">
                <i className="ph ph-x" aria-hidden="true"></i>
              </button>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", flex: 1, minHeight: 0 }}>
              {/* Liste des critères à gauche */}
              <nav style={{
                background: "var(--color-canvas)",
                borderRight: "1px solid var(--color-line)",
                padding: 10, overflowY: "auto",
              }}>
                {criteres.map((c, i) => {
                  const isOn = c.label === openCritere.label;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setOpenCritere(c)}
                      style={{
                        display: "flex", flexDirection: "column", gap: 4,
                        width: "100%", textAlign: "left",
                        padding: "10px 12px", marginBottom: 4,
                        background: isOn ? "var(--color-surface)" : "transparent",
                        border: isOn ? "1px solid var(--color-line)" : "1px solid transparent",
                        borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <span style={{
                        fontSize: 12.5, color: isOn ? "var(--color-ink)" : "var(--color-sepia)",
                        fontWeight: isOn ? 500 : 400, lineHeight: 1.3,
                      }}>
                        {c.label}
                      </span>
                      <span style={{
                        fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)",
                      }}>
                        {c.score} / {c.ponderation} pts
                      </span>
                      <div style={{
                        height: 3, background: "var(--color-canvas)", borderRadius: 1,
                        overflow: "hidden", marginTop: 2,
                      }}>
                        <div style={{
                          width: `${c.bar}%`, height: "100%",
                          background: c.bar >= 70 ? "var(--color-success)" : c.bar >= 40 ? "var(--color-warning)" : "var(--color-terracotta)",
                        }}></div>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Détail à droite */}
              <div style={{ padding: 22, overflowY: "auto" }}>
                <h4 style={{
                  fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400,
                  color: "var(--color-ink)", margin: "0 0 4px",
                }}>
                  {openCritere.label}
                </h4>
                {openCritere.description ? (
                  <p style={{ fontSize: 13, color: "var(--color-shale)", lineHeight: 1.55, margin: "0 0 18px" }}>
                    {openCritere.description}
                  </p>
                ) : null}

                {/* Bloc score */}
                <div style={{
                  background: "var(--color-canvas)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 10, padding: 14, marginBottom: 18,
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
                      Score estimé
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--color-ink)" }}>
                      {openCritere.score}
                      <span style={{ fontSize: 14, color: "var(--color-stone)" }}> / {openCritere.ponderation}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
                      Marge potentielle
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--color-terracotta)" }}>
                      +{Math.max(0, openCritere.ponderation - openCritere.score)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
                      Pondération
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--color-ink)" }}>
                      {openCritere.ponderation}<span style={{ fontSize: 14, color: "var(--color-stone)" }}> pts</span>
                    </div>
                  </div>
                </div>

                {/* Pièces concernées */}
                <h5 style={{
                  fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "var(--color-stone)", fontWeight: 500, margin: "0 0 10px",
                }}>
                  Pièces qui contribuent à ce critère
                </h5>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                  {(() => {
                    const cats = deduireCategoriesPourCritere(openCritere.label);
                    const relevantes = pieces.filter((p) => cats.includes(p.categorie));
                    if (relevantes.length === 0) {
                      return <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>Aucune pièce dans le dossier ne couvre directement ce critère.</p>;
                    }
                    return relevantes.map((p) => {
                      const statusIcon = p.status === "ok" ? "ph-check-circle"
                                       : p.status === "draft" ? "ph-pencil-simple"
                                       : p.status === "ai" ? "ph-sparkle"
                                       : "ph-x-circle";
                      const statusColor = p.status === "ok" ? "var(--color-success)"
                                        : p.status === "draft" ? "var(--color-warning)"
                                        : p.status === "ai" ? "var(--color-terracotta)"
                                        : "var(--color-danger)";
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 10,
                            alignItems: "center",
                            padding: "8px 12px",
                            background: "var(--color-page)",
                            border: "1px solid var(--color-line)",
                            borderRadius: 6,
                            fontSize: 12.5,
                          }}
                        >
                          <i className={`ph-fill ${statusIcon}`} style={{ color: statusColor, fontSize: 16 }} aria-hidden="true"></i>
                          <span style={{ color: "var(--color-ink)" }}>
                            {p.nom}
                            <span style={{ fontSize: 10, color: "var(--color-stone)", marginLeft: 6 }}>
                              · cat. {p.categorie}
                            </span>
                          </span>
                          <span style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
                            {p.status === "ok" ? "Fournie" : p.status === "draft" ? "Brouillon" : p.status === "ai" ? "IA" : "Manquante"}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Actions concrètes pour gagner des points */}
                <h5 style={{
                  fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "var(--color-stone)", fontWeight: 500, margin: "0 0 10px",
                }}>
                  Actions pour gagner des points
                </h5>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(() => {
                    const actions = genererActions(openCritere, pieces);
                    if (actions.length === 0) {
                      return <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>Score déjà au plafond ou aucune action proposée — bravo !</p>;
                    }
                    return actions.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12,
                          alignItems: "center",
                          padding: "10px 14px",
                          background: "var(--color-terracotta-soft)",
                          border: "1px solid var(--color-terracotta-line)",
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: "var(--color-terracotta)", color: "#fff",
                          display: "grid", placeItems: "center", fontSize: 16,
                        }}>
                          <i className={a.icon} aria-hidden="true"></i>
                        </div>
                        <span style={{ color: "var(--color-ink)", lineHeight: 1.4 }}>
                          {a.text}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 12,
                          color: "var(--color-terracotta-press)", fontWeight: 600,
                          background: "var(--color-page)", padding: "4px 10px",
                          borderRadius: 4, border: "1px solid var(--color-terracotta-line)",
                          whiteSpace: "nowrap",
                        }}>
                          +{a.gain} pts
                        </span>
                      </div>
                    ));
                  })()}
                </div>

                <div style={{
                  marginTop: 18, padding: "10px 12px",
                  fontSize: 11, color: "var(--color-stone)",
                  background: "var(--color-canvas)", borderRadius: 6,
                  fontStyle: "italic", lineHeight: 1.5,
                }}>
                  Score IA estimé — les gains affichés sont des projections basées sur l&apos;état des pièces.
                  L&apos;évaluation finale est faite par le bailleur après dépôt.
                </div>
              </div>
            </div>
        </>) : null}
      </Dialog>
    </>
  );
}
