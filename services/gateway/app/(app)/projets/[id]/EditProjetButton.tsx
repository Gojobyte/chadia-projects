"use client";

import { useState, useTransition } from "react";

type Statut = "MONTAGE" | "ACTIF" | "ACHEVE" | "SUSPENDU" | "ANNULE";
type Domaine =
  | "URGENCE" | "JEUNESSE" | "GENRE" | "FEMMES" | "EDUCATION"
  | "EAU" | "SANTE" | "COHESION" | "FORMATION" | "AGRICULTURE" | "AUTRE";

interface Props {
  projet: {
    id: string;
    titre: string;
    description?: string | null;
    zone?: string | null;
    domaine: string;
    statut: Statut;
    urgent: boolean;
    echeance?: string | null;
    etapeLabel?: string | null;
    budgetEstime?: number | null;
    budgetRealise?: number | null;
    devise: string;
    beneficiaires?: number | null;
    bailleurs: string[];
    team: string[];
    dateDebut?: string | null;
    dateFin?: string | null;
  };
  updateAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}

const DOMAINES: Domaine[] = [
  "URGENCE", "JEUNESSE", "GENRE", "FEMMES", "EDUCATION",
  "EAU", "SANTE", "COHESION", "FORMATION", "AGRICULTURE", "AUTRE",
];

const DOMAINE_LABEL: Record<Domaine, string> = {
  URGENCE: "Urgence",
  JEUNESSE: "Jeunesse",
  GENRE: "Genre",
  FEMMES: "Autonomisation des femmes",
  EDUCATION: "Éducation",
  EAU: "WASH / Eau-hygiène",
  SANTE: "Santé",
  COHESION: "Cohésion sociale",
  FORMATION: "Formation professionnelle",
  AGRICULTURE: "Agriculture",
  AUTRE: "Autre",
};

const STATUTS: Statut[] = ["MONTAGE", "ACTIF", "ACHEVE", "SUSPENDU", "ANNULE"];
const STATUT_LABEL: Record<Statut, string> = {
  MONTAGE: "En montage",
  ACTIF: "Actif",
  ACHEVE: "Achevé",
  SUSPENDU: "Suspendu",
  ANNULE: "Annulé",
};

export function EditProjetButton({ projet, updateAction }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateAction(fd);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error || "Erreur");
      }
    });
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn--secondary btn--sm"
      >
        <i className="ph ph-pencil-simple" aria-hidden="true"></i> Modifier
      </button>

      {open ? (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(26,22,18,0.55)", backdropFilter: "blur(4px)",
            display: "grid", placeItems: "center", padding: 24,
          }}
        >
          <div style={{
            background: "var(--color-surface)", borderRadius: 12,
            width: "100%", maxWidth: 720, maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 24px 60px -20px rgba(26,22,18,0.4)",
            overflow: "hidden",
          }}>
            <header style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-line)",
              background: "var(--color-surface-2)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
                  Édition projet
                </div>
                <h3 style={{
                  fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400,
                  color: "var(--color-ink)", margin: 0, lineHeight: 1.1,
                }}>
                  Modifier <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>{projet.titre}</em>
                </h3>
              </div>
              <button type="button" onClick={close} className="btn btn--ghost btn--sm">
                <i className="ph ph-x" aria-hidden="true"></i>
              </button>
            </header>

            <form onSubmit={submit} style={{
              padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto",
            }}>
              <div className="form-grid">
                <div className="field-uc span-2">
                  <span className="label">Titre du projet</span>
                  <input className="input" name="titre" defaultValue={projet.titre} required />
                </div>
                <div className="field-uc span-2">
                  <span className="label">Description</span>
                  <textarea
                    className="textarea"
                    name="description"
                    rows={3}
                    defaultValue={projet.description ?? ""}
                  />
                </div>
                <div className="field-uc">
                  <span className="label">Statut</span>
                  <select className="input" name="statut" defaultValue={projet.statut}>
                    {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
                  </select>
                </div>
                <div className="field-uc">
                  <span className="label">Domaine</span>
                  <select className="input" name="domaine" defaultValue={projet.domaine}>
                    {DOMAINES.map((d) => <option key={d} value={d}>{DOMAINE_LABEL[d]}</option>)}
                  </select>
                </div>
                <div className="field-uc">
                  <span className="label">Zone d&apos;intervention</span>
                  <input className="input" name="zone" defaultValue={projet.zone ?? ""} />
                </div>
                <div className="field-uc">
                  <span className="label">Étape courante</span>
                  <input className="input" name="etapeLabel" defaultValue={projet.etapeLabel ?? ""} />
                </div>
                <div className="field-uc">
                  <span className="label">Date de début</span>
                  <input
                    className="input"
                    name="dateDebut"
                    type="date"
                    defaultValue={projet.dateDebut?.slice(0, 10) ?? ""}
                  />
                </div>
                <div className="field-uc">
                  <span className="label">Date de fin prévue</span>
                  <input
                    className="input"
                    name="dateFin"
                    type="date"
                    defaultValue={projet.dateFin?.slice(0, 10) ?? ""}
                  />
                </div>
                <div className="field-uc">
                  <span className="label">Budget estimé</span>
                  <input className="input mono" name="budgetEstime" type="number" min={0} step={1000} defaultValue={projet.budgetEstime ?? ""} />
                </div>
                <div className="field-uc">
                  <span className="label">Budget réalisé</span>
                  <input className="input mono" name="budgetRealise" type="number" min={0} step={1000} defaultValue={projet.budgetRealise ?? ""} />
                </div>
                <div className="field-uc">
                  <span className="label">Devise</span>
                  <select className="input" name="devise" defaultValue={projet.devise}>
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="field-uc">
                  <span className="label">Bénéficiaires</span>
                  <input className="input mono" name="beneficiaires" type="number" min={0} defaultValue={projet.beneficiaires ?? ""} />
                </div>
                <div className="field-uc">
                  <span className="label">Bailleurs (sigles séparés par virgule)</span>
                  <input className="input" name="bailleurs" defaultValue={(projet.bailleurs || []).join(", ")} placeholder="UE, PNUD, AFD" />
                </div>
                <div className="field-uc">
                  <span className="label">Équipe (initiales séparées par virgule)</span>
                  <input className="input" name="team" defaultValue={(projet.team || []).join(", ")} placeholder="AS, FH, MM" />
                </div>
                <div className="field-uc span-2">
                  <span className="label">Échéance (libellé libre)</span>
                  <input className="input" name="echeance" defaultValue={projet.echeance ?? ""} placeholder="Clôture · 30 sept. 2027" />
                </div>
                <div className="field-uc span-2">
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-sepia)" }}>
                    <input type="checkbox" name="urgent" defaultChecked={projet.urgent} />
                    Projet urgent — accent terracotta dans la liste
                  </label>
                </div>
              </div>

              {error ? (
                <div style={{
                  background: "var(--color-danger-soft)", color: "var(--color-danger)",
                  border: "1px solid rgba(163,45,45,0.18)", borderRadius: 6,
                  padding: "8px 12px", fontSize: 13,
                }}>
                  <i className="ph ph-warning-circle" aria-hidden="true"></i> {error}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid var(--color-line)" }}>
                <button type="button" onClick={close} className="btn btn--ghost btn--sm" disabled={pending}>
                  Annuler
                </button>
                <button type="submit" className="btn btn--accent btn--sm" disabled={pending}>
                  {pending ? "Enregistrement…" : (
                    <>
                      <i className="ph ph-floppy-disk" aria-hidden="true"></i> Enregistrer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
