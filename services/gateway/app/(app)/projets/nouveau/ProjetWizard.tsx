"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

// Types pour les valeurs initiales et l'action
type Source = "vierge" | "candidature" | "modele";
type Domaine =
  | "URGENCE" | "JEUNESSE" | "GENRE" | "FEMMES" | "EDUCATION"
  | "EAU" | "SANTE" | "COHESION" | "FORMATION" | "AGRICULTURE" | "AUTRE";
type Statut = "MONTAGE" | "ACTIF" | "SUSPENDU";

const DOMAINES: Domaine[] = [
  "URGENCE", "JEUNESSE", "GENRE", "FEMMES", "EDUCATION",
  "EAU", "SANTE", "COHESION", "FORMATION", "AGRICULTURE", "AUTRE",
];
const DOMAINE_LABEL: Record<Domaine, string> = {
  URGENCE: "Urgence",
  JEUNESSE: "Jeunesse",
  GENRE: "Genre & protection",
  FEMMES: "Autonomisation des femmes",
  EDUCATION: "Éducation",
  EAU: "WASH / Eau-hygiène",
  SANTE: "Santé",
  COHESION: "Cohésion sociale",
  FORMATION: "Formation professionnelle",
  AGRICULTURE: "Agriculture",
  AUTRE: "Autre",
};

const STATUTS: Statut[] = ["MONTAGE", "ACTIF", "SUSPENDU"];
const STATUT_LABEL: Record<Statut, string> = {
  MONTAGE: "Brouillon · note conceptuelle",
  ACTIF: "Conventionné · à démarrer",
  SUSPENDU: "Suspendu",
};

const STEPS = ["Source", "Identité du projet", "Équipe & bailleur", "Confirmation"];

interface Props {
  /** Référence pré-générée (PRJ-AAAA-NN) */
  refSuggested: string;
  /** Server Action de création — accepte une FormData, redirige en cas de succès */
  createAction: (formData: FormData) => Promise<void>;
}

export function ProjetWizard({ refSuggested, createAction }: Props) {
  const [step, setStep] = useState(0); // 0..3
  const [source, setSource] = useState<Source>("vierge");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form values — on les garde en state pour les afficher en page de confirmation
  const [values, setValues] = useState({
    reference: refSuggested,
    titre: "",
    description: "",
    zone: "",
    domaine: "AUTRE" as Domaine,
    statut: "MONTAGE" as Statut,
    duree: "9 mois",
    dateDebut: "",
    beneficiaires: "",
    bailleurs: "",
    team: "",
    budgetEstime: "",
    urgent: false,
    etapeLabel: "",
  });

  function update<K extends keyof typeof values>(key: K, v: (typeof values)[K]) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function next() {
    setError(null);
    // Validation simple par étape
    if (step === 1 && !values.titre.trim()) {
      setError("Le titre est obligatoire pour passer à l'étape suivante.");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function prev() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function submit() {
    setError(null);
    const fd = new FormData();
    fd.set("titre", values.titre);
    fd.set("description", values.description);
    fd.set("zone", values.zone);
    fd.set("domaine", values.domaine);
    fd.set("statut", values.statut);
    fd.set("urgent", values.urgent ? "on" : "");
    fd.set("bailleurs", values.bailleurs);
    fd.set("team", values.team);
    fd.set("etapeLabel", values.etapeLabel || values.duree);
    if (values.budgetEstime) fd.set("budgetEstime", values.budgetEstime);
    if (values.dateDebut) fd.set("dateDebut", values.dateDebut);
    if (values.beneficiaires) fd.set("beneficiaires", values.beneficiaires);
    startTransition(async () => {
      try {
        await createAction(fd);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur à la création");
      }
    });
  }

  return (
    <div className="wiz-shell">
      {/* ============ Steps indicator ============ */}
      <div className="wiz-steps">
        {STEPS.map((label, i) => {
          const done = i < step;
          const on = i === step;
          return (
            <span key={label} style={{ display: "contents" }}>
              <div className={`wiz-step ${done ? "done" : ""} ${on ? "on" : ""}`}>
                <div className="n">
                  {done ? <i className="ph ph-check" aria-hidden="true"></i> : String(i + 1).padStart(2, "0")}
                </div>
                <div className="t">{label}</div>
              </div>
              {i < STEPS.length - 1 ? <div className="line" /> : null}
            </span>
          );
        })}
      </div>

      <div className="card" style={{ padding: "24px 28px" }}>
        {/* ============ Header dynamique ============ */}
        <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid var(--color-line)" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-stone)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Étape {String(step + 1).padStart(2, "0")} sur {STEPS.length}
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 400,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            {STEPS[step]}
          </h3>
          <div style={{ fontSize: 12, color: "var(--color-stone)", marginTop: 6 }}>
            {step === 0 && "D'où démarre ce projet ? CHADIA pré-remplira la fiche, le cadre logique et le budget selon votre choix."}
            {step === 1 && "Données structurantes — référence, intitulé, zone d'intervention, secteur, durée. Vous pourrez tout modifier ensuite."}
            {step === 2 && "Bailleurs cofinanceurs, équipe affectée, budget estimé. Plusieurs bailleurs possibles, séparés par des virgules."}
            {step === 3 && "Récapitulatif avant création. Vous pourrez tout corriger une fois le projet créé."}
          </div>
        </div>

        {/* ============ Contenu par étape ============ */}
        {step === 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            <button
              type="button"
              onClick={() => setSource("vierge")}
              className={`source-card ${source === "vierge" ? "on" : ""}`}
            >
              <div className="ic" style={{ background: "var(--color-terracotta-soft)", color: "var(--color-terracotta)" }}>
                <i className="ph ph-plus" aria-hidden="true"></i>
              </div>
              <div className="body">
                <h5>Projet vierge</h5>
                <p>Démarrer de zéro · note conceptuelle à rédiger.</p>
              </div>
              <i className={`ph ${source === "vierge" ? "ph-check-circle-fill" : "ph-circle"}`} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              onClick={() => setSource("candidature")}
              className={`source-card ${source === "candidature" ? "on" : ""}`}
            >
              <div className="ic" style={{ background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                <i className="ph ph-trophy" aria-hidden="true"></i>
              </div>
              <div className="body">
                <h5>Candidature remportée</h5>
                <p>Reprendre une candidature ATTRIBUÉE comme base du projet.</p>
              </div>
              <i className={`ph ${source === "candidature" ? "ph-check-circle-fill" : "ph-circle"}`} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              onClick={() => setSource("modele")}
              className={`source-card ${source === "modele" ? "on" : ""}`}
            >
              <div className="ic" style={{ background: "var(--color-info-soft)", color: "var(--color-info)" }}>
                <i className="ph ph-scroll" aria-hidden="true"></i>
              </div>
              <div className="body">
                <h5>À partir d&apos;un modèle</h5>
                <p>Dupliquer une trame de la bibliothèque (PRAG UE, PNUD…).</p>
              </div>
              <i className={`ph ${source === "modele" ? "ph-check-circle-fill" : "ph-circle"}`} aria-hidden="true"></i>
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form-grid">
            <div className="field-uc">
              <span className="label">Référence projet</span>
              <input
                className="input"
                value={values.reference}
                onChange={(e) => update("reference", e.target.value)}
                placeholder="PRJ-AAAA-NN"
              />
              <span className="help">Auto-générée · modifiable</span>
            </div>
            <div className="field-uc">
              <span className="label">Statut initial</span>
              <select
                className="input"
                value={values.statut}
                onChange={(e) => update("statut", e.target.value as Statut)}
              >
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {STATUT_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-uc span-2">
              <span className="label">Intitulé du projet</span>
              <input
                className="input"
                value={values.titre}
                onChange={(e) => update("titre", e.target.value)}
                placeholder="Ex. Renforcement WASH dans les communes du Batha-Sud"
                required
              />
            </div>
            <div className="field-uc span-2">
              <span className="label">Description courte</span>
              <textarea
                className="textarea"
                rows={3}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Une à trois phrases résumant l'objet, la zone et les bénéficiaires…"
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
                  minHeight: 96,
                  lineHeight: 1.55,
                }}
              />
            </div>
            <div className="field-uc">
              <span className="label">Zone d&apos;intervention</span>
              <input
                className="input"
                list="zones"
                value={values.zone}
                onChange={(e) => update("zone", e.target.value)}
                placeholder="Mongo, Guéra"
              />
              <datalist id="zones">
                <option value="N'Djaména" />
                <option value="Mongo, Guéra" />
                <option value="Bitkine, Guéra" />
                <option value="Batha" />
                <option value="Multi-zone" />
              </datalist>
            </div>
            <div className="field-uc">
              <span className="label">Domaine principal</span>
              <select
                className="input"
                value={values.domaine}
                onChange={(e) => update("domaine", e.target.value as Domaine)}
              >
                {DOMAINES.map((d) => (
                  <option key={d} value={d}>
                    {DOMAINE_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-uc">
              <span className="label">Durée prévisionnelle</span>
              <input
                className="input"
                value={values.duree}
                onChange={(e) => update("duree", e.target.value)}
                placeholder="9 mois"
              />
            </div>
            <div className="field-uc">
              <span className="label">Date de démarrage</span>
              <input
                className="input"
                type="date"
                value={values.dateDebut}
                onChange={(e) => update("dateDebut", e.target.value)}
              />
            </div>
            <div className="field-uc span-2">
              <span className="label">Bénéficiaires cibles</span>
              <input
                className="input"
                value={values.beneficiaires}
                onChange={(e) => update("beneficiaires", e.target.value)}
                placeholder="Ex. 2 400 ménages · 14 villages · 8 200 personnes"
              />
            </div>
            <div className="field-uc span-2">
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--color-sepia)" }}>
                <input
                  type="checkbox"
                  checked={values.urgent}
                  onChange={(e) => update("urgent", e.target.checked)}
                />
                Projet urgent — s&apos;affiche en haut de la liste avec accent terracotta
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-grid">
            <div className="field-uc span-2">
              <span className="label">Bailleurs (sigles séparés par des virgules)</span>
              <input
                className="input"
                value={values.bailleurs}
                onChange={(e) => update("bailleurs", e.target.value)}
                placeholder="UE, PNUD, CF"
              />
              <span className="help">UE · PNUD · CF · AFD · BM · ECHO · USAID</span>
            </div>
            <div className="field-uc">
              <span className="label">Équipe (initiales séparées par des virgules)</span>
              <input
                className="input"
                value={values.team}
                onChange={(e) => update("team", e.target.value)}
                placeholder="AS, FH, MM, DH"
              />
            </div>
            <div className="field-uc">
              <span className="label">Budget estimé (FCFA)</span>
              <input
                className="input mono"
                type="number"
                min={0}
                step={1000}
                value={values.budgetEstime}
                onChange={(e) => update("budgetEstime", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="field-uc span-2">
              <span className="label">Étape ou jalon courant (libellé libre)</span>
              <input
                className="input"
                value={values.etapeLabel}
                onChange={(e) => update("etapeLabel", e.target.value)}
                placeholder="Ex. Note conceptuelle déposée · Recherche de cofinanceur"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ display: "grid", gap: 14 }}>
            <SummaryRow label="Source" value={source === "vierge" ? "Projet vierge" : source === "candidature" ? "Candidature remportée" : "À partir d'un modèle"} />
            <SummaryRow label="Référence" value={values.reference} mono />
            <SummaryRow label="Titre" value={values.titre || "—"} />
            {values.description ? <SummaryRow label="Description" value={values.description} /> : null}
            <SummaryRow label="Zone" value={values.zone || "—"} />
            <SummaryRow label="Domaine" value={DOMAINE_LABEL[values.domaine]} />
            <SummaryRow label="Statut initial" value={STATUT_LABEL[values.statut]} />
            <SummaryRow label="Durée" value={values.duree || "—"} />
            <SummaryRow label="Démarrage" value={values.dateDebut ? new Date(values.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
            <SummaryRow label="Bénéficiaires" value={values.beneficiaires || "—"} />
            <SummaryRow label="Bailleurs" value={values.bailleurs || "—"} />
            <SummaryRow label="Équipe" value={values.team || "—"} />
            <SummaryRow label="Budget estimé" value={values.budgetEstime ? `${new Intl.NumberFormat("fr-FR").format(Number(values.budgetEstime))} FCFA` : "—"} mono />
            {values.urgent ? <SummaryRow label="Urgent" value="Oui — accent terracotta dans la liste" /> : null}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "var(--color-danger-soft)",
              color: "var(--color-danger)",
              border: "1px solid rgba(163,45,45,0.18)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <i className="ph ph-warning-circle" aria-hidden="true"></i> {error}
          </div>
        ) : null}

        {/* ============ Navigation ============ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid var(--color-line)",
          }}
        >
          {step === 0 ? (
            <Link href="/projets" className="btn btn--ghost btn--sm">
              <i className="ph ph-arrow-left" aria-hidden="true"></i> Annuler
            </Link>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={prev} disabled={pending}>
              <i className="ph ph-arrow-left" aria-hidden="true"></i> Étape précédente
            </button>
          )}
          <div style={{ fontSize: 11, color: "var(--color-stone)" }}>
            {pending ? "Création en cours…" : "Brouillon enregistré localement"}
          </div>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn--accent btn--sm" onClick={next} disabled={pending}>
              Étape suivante <i className="ph ph-arrow-right" aria-hidden="true"></i>
            </button>
          ) : (
            <button type="button" className="btn btn--accent btn--sm" onClick={submit} disabled={pending}>
              <i className="ph ph-check-circle" aria-hidden="true"></i> Créer le projet
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .source-card {
          display: grid;
          grid-template-columns: 44px 1fr 24px;
          gap: 14px;
          align-items: center;
          padding: 14px 16px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 8px;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 120ms, background 120ms;
        }
        .source-card:hover {
          background: var(--color-canvas);
          border-color: var(--color-line-strong);
        }
        .source-card.on {
          border-color: var(--color-terracotta);
          background: var(--color-terracotta-soft);
        }
        .source-card .ic {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          font-size: 22px;
        }
        .source-card .body h5 {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 400;
          color: var(--color-ink);
          margin: 0 0 2px;
        }
        .source-card .body p {
          font-size: 12px;
          color: var(--color-stone);
          margin: 0;
          line-height: 1.4;
        }
        .source-card > .ph {
          font-size: 18px;
          color: var(--color-stone);
        }
        .source-card.on > .ph {
          color: var(--color-terracotta);
        }
      `}</style>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        padding: "10px 12px",
        background: "var(--color-surface-2)",
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--color-stone)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ color: "var(--color-ink)", fontFamily: mono ? "var(--font-mono)" : "inherit" }}>{value}</span>
    </div>
  );
}
