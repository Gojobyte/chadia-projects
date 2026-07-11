"use client";

import { useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { useClickOutsideAndEscape } from "@/hooks/useClickOutsideAndEscape";
import { Dialog } from "@/components/Dialog";

type Statut =
  | "BROUILLON"
  | "EN_REDACTION"
  | "EN_VALIDATION"
  | "SOUMISE"
  | "ATTRIBUEE"
  | "NON_RETENUE"
  | "ABANDONNEE";

interface Props {
  current: Statut;
  /** Server Actions liées (bound avec cand.id côté server) */
  toEnRedaction?: (formData: FormData) => Promise<void>;
  toEnValidation?: (formData: FormData) => Promise<void>;
  toSoumise?: (formData: FormData) => Promise<void>;
  toAttribuee?: (formData: FormData) => Promise<void>;
  toNonRetenue?: (formData: FormData) => Promise<void>;
  toAbandonnee?: (formData: FormData) => Promise<void>;
  /** Bouton de suppression (composant déjà existant) — passé en children. */
  deleteSlot?: React.ReactNode;
}

// Les 5 étapes principales du parcours nominal (BROUILLON → ATTRIBUEE).
// ABANDONNEE et NON_RETENUE sont des terminaisons "hors stepper".
const STEPS: { key: Statut; label: string; icon: string }[] = [
  { key: "BROUILLON", label: "Brouillon", icon: "ph-pencil-line" },
  { key: "EN_REDACTION", label: "Rédaction", icon: "ph-pencil-simple" },
  { key: "EN_VALIDATION", label: "Validation", icon: "ph-eye" },
  { key: "SOUMISE", label: "Soumise", icon: "ph-paper-plane-tilt" },
  { key: "ATTRIBUEE", label: "Attribuée", icon: "ph-trophy" },
];

function currentIndex(statut: Statut): number {
  if (statut === "ABANDONNEE") return -1;
  if (statut === "NON_RETENUE") return 4; // dernière étape "atteinte" symboliquement = ATTRIBUEE (qui est rejected)
  return STEPS.findIndex((s) => s.key === statut);
}

export function WorkflowStepper({
  current,
  toEnRedaction,
  toEnValidation,
  toSoumise,
  toAttribuee,
  toNonRetenue,
  toAbandonnee,
  deleteSlot,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const abandonFormRef = useRef<HTMLFormElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // P0 a11y : remplace onMouseLeave (inaccessible clavier) par
  // click-outside + Escape pour fermer le menu.
  useClickOutsideAndEscape(menuRef, menuOpen, () => setMenuOpen(false));
  const idx = currentIndex(current);
  const isTerminal = current === "ATTRIBUEE" || current === "NON_RETENUE" || current === "ABANDONNEE";

  // Détermine la "prochaine action" contextuelle à proposer
  // sous forme d'un bouton primaire bien visible.
  type ActionSpec = {
    label: string;
    icon: string;
    pendingLabel: string;
    action: (fd: FormData) => Promise<void>;
    tone: "primary" | "accent";
  };
  let primaryAction: ActionSpec | null = null;
  let secondaryAction: ActionSpec | null = null;

  if (current === "BROUILLON" && toEnRedaction) {
    primaryAction = {
      label: "Démarrer la rédaction",
      icon: "ph-pencil-simple",
      pendingLabel: "Démarrage…",
      action: toEnRedaction,
      tone: "primary",
    };
  } else if (current === "EN_REDACTION" && toEnValidation) {
    primaryAction = {
      label: "Soumettre à validation",
      icon: "ph-eye",
      pendingLabel: "Soumission…",
      action: toEnValidation,
      tone: "primary",
    };
  } else if (current === "EN_VALIDATION" && toSoumise) {
    primaryAction = {
      label: "Déposer la candidature",
      icon: "ph-paper-plane-tilt",
      pendingLabel: "Dépôt…",
      action: toSoumise,
      tone: "accent",
    };
  } else if (current === "SOUMISE") {
    if (toAttribuee) {
      primaryAction = {
        label: "Marquer attribuée",
        icon: "ph-trophy",
        pendingLabel: "Mise à jour…",
        action: toAttribuee,
        tone: "accent",
      };
    }
    if (toNonRetenue) {
      secondaryAction = {
        label: "Non retenue",
        icon: "ph-x-circle",
        pendingLabel: "Mise à jour…",
        action: toNonRetenue,
        tone: "primary",
      };
    }
  }

  return (
    <section className="workflow-stepper">
      <header className="ws-h">
        <div className="ws-eb">Workflow · candidature</div>
        <h3 className="ws-t">
          Étape actuelle ·{" "}
          <em>
            {current === "ABANDONNEE"
              ? "Abandonnée"
              : current === "ATTRIBUEE"
              ? "Attribuée 🎉"
              : current === "NON_RETENUE"
              ? "Non retenue"
              : STEPS[idx]?.label}
          </em>
        </h3>
      </header>

      {/* Stepper visuel */}
      {!isTerminal || current === "ATTRIBUEE" || current === "NON_RETENUE" ? (
        <ol className="ws-steps">
          {STEPS.map((s, i) => {
            // Pour NON_RETENUE : SOUMISE (i=3) est done, ATTRIBUEE (i=4) est rejected.
            // Pour les autres statuts : règle linéaire normale.
            const isRejected = current === "NON_RETENUE" && i === STEPS.length - 1;
            const isDone = current === "NON_RETENUE" ? i < STEPS.length - 1 : i < idx;
            const isCurrent = i === idx && current !== "NON_RETENUE";
            const isFuture = !isDone && !isCurrent && !isRejected;
            // Statut textuel pour lecteurs d'écran (alternative à la couleur)
            const srStatus = isDone ? "terminée" : isCurrent ? "en cours" : isRejected ? "rejetée" : "à venir";
            return (
              <li
                key={s.key}
                className={`ws-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""} ${
                  isFuture ? "future" : ""
                } ${isRejected ? "rejected" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="ws-bullet">
                  {isDone ? (
                    <i className="ph ph-check" aria-hidden="true"></i>
                  ) : isRejected ? (
                    <i className="ph ph-x" aria-hidden="true"></i>
                  ) : (
                    <i className={`ph ${s.icon}`} aria-hidden="true"></i>
                  )}
                </div>
                <div className="ws-label">
                  {s.label}
                  <span className="sr-only" style={{
                    position: "absolute", width: 1, height: 1, padding: 0,
                    margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap", border: 0,
                  }}>
                    {" — "}{srStatus}
                  </span>
                </div>
                {i < STEPS.length - 1 ? <div className="ws-connector" aria-hidden="true"></div> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="ws-terminal">
          <i className="ph-fill ph-circle-dashed" aria-hidden="true"></i>
          Candidature abandonnée — plus de transition possible
        </div>
      )}

      {/* Bandeau d'action contextuelle */}
      {!isTerminal ? (
        <div className="ws-actions">
          {primaryAction ? (
            <form action={primaryAction.action}>
              <SubmitButton
                className={
                  primaryAction.tone === "accent"
                    ? "btn btn--accent"
                    : "btn btn--primary"
                }
                icon={primaryAction.icon}
                pendingLabel={primaryAction.pendingLabel}
              >
                {primaryAction.label}
              </SubmitButton>
            </form>
          ) : null}
          {secondaryAction ? (
            <form action={secondaryAction.action}>
              <SubmitButton
                className="btn btn--secondary"
                icon={secondaryAction.icon}
                pendingLabel={secondaryAction.pendingLabel}
              >
                {secondaryAction.label}
              </SubmitButton>
            </form>
          ) : null}

          {/* Menu actions secondaires */}
          <div className="ws-more" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="btn btn--ghost btn--sm"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Actions secondaires sur la candidature"
              title="Actions secondaires"
            >
              <i className="ph ph-dots-three-vertical" aria-hidden="true"></i>
            </button>
            {menuOpen ? (
              <div className="ws-more-menu" role="menu">
                {toAbandonnee ? (
                  <button
                    type="button"
                    className="ws-more-item"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); setConfirmAbandon(true); }}
                  >
                    <i className="ph ph-circle-dashed" aria-hidden="true"></i> Abandonner le dossier
                  </button>
                ) : null}
                {deleteSlot ? (
                  <div className="ws-more-item ws-more-delete">
                    {deleteSlot}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .workflow-stepper {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 18px 20px;
          margin-top: 18px;
        }
        .ws-h { margin-bottom: 14px; }
        .ws-eb {
          font-size: 10px;
          letter-spacing: 0.14em;
          color: var(--color-stone);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .ws-t {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 400;
          color: var(--color-ink);
          margin: 0;
        }
        .ws-t em {
          color: var(--color-terracotta);
          font-style: italic;
        }

        .ws-steps {
          list-style: none;
          padding: 0;
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 0;
          overflow-x: auto;
        }
        .ws-step {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          position: relative;
          min-width: 110px;
        }
        .ws-bullet {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--color-canvas);
          border: 2px solid var(--color-line-strong);
          color: var(--color-stone);
          font-size: 14px;
          flex-shrink: 0;
          z-index: 1;
        }
        .ws-step.done .ws-bullet {
          background: var(--color-success);
          border-color: var(--color-success);
          color: #fff;
        }
        .ws-step.current .ws-bullet {
          background: var(--color-terracotta);
          border-color: var(--color-terracotta);
          color: #fff;
          box-shadow: 0 0 0 4px var(--color-terracotta-soft);
        }
        .ws-step.rejected .ws-bullet {
          background: var(--color-danger);
          border-color: var(--color-danger);
          color: #fff;
        }
        .ws-label {
          font-size: 12px;
          color: var(--color-stone);
          line-height: 1.2;
          white-space: nowrap;
        }
        .ws-step.done .ws-label { color: var(--color-success); }
        .ws-step.current .ws-label { color: var(--color-ink); font-weight: 500; }
        .ws-step.rejected .ws-label { color: var(--color-danger); }
        .ws-connector {
          position: absolute;
          left: 28px;
          right: -10px;
          top: 14px;
          height: 2px;
          background: var(--color-line);
          margin-left: 6px;
          z-index: 0;
        }
        .ws-step.done .ws-connector { background: var(--color-success); }

        .ws-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 14px;
          border-top: 1px dashed var(--color-line);
        }
        .ws-more { position: relative; margin-left: auto; }
        .ws-more-menu {
          position: absolute;
          right: 0;
          top: 36px;
          min-width: 220px;
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 8px;
          box-shadow: 0 8px 24px -10px rgba(26, 22, 18, 0.18);
          padding: 4px;
          z-index: 30;
          display: flex;
          flex-direction: column;
          font-size: 12.5px;
        }
        .ws-more-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          color: var(--color-sepia);
          border-radius: 4px;
          background: transparent;
          border: 0;
          width: 100%;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
        }
        .ws-more-item:hover {
          background: var(--color-canvas);
          color: var(--color-ink);
        }
        .ws-more-delete {
          padding: 4px 8px;
          border-top: 1px solid var(--color-line);
          margin-top: 4px;
        }

        .ws-terminal {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          background: var(--color-canvas);
          border-radius: 6px;
          font-size: 13px;
          color: var(--color-stone);
        }
        .ws-terminal i {
          color: var(--color-mineral);
          font-size: 22px;
        }
      `}</style>

      <Dialog
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Confirmer l'abandon de la candidature"
        maxWidth={460}
      >
        <div style={{ padding: "20px 24px" }}>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 400,
            color: "var(--color-ink)",
            margin: "0 0 12px",
          }}>
            Abandonner ce <em style={{ color: "var(--color-danger)", fontStyle: "italic" }}>dossier</em> ?
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-sepia)", lineHeight: 1.55, margin: "0 0 16px" }}>
            La candidature sera marquée comme <strong>abandonnée</strong> et ne pourra plus être
            modifiée. Vous pourrez toujours la consulter dans l&apos;historique, mais aucune
            action de workflow ne sera plus possible.
          </p>
          <p style={{ fontSize: 12, color: "var(--color-stone)", margin: "0 0 18px" }}>
            Cette action n&apos;est pas réversible côté workflow.
          </p>
          <form action={toAbandonnee} ref={abandonFormRef}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmAbandon(false)}
              >
                Annuler
              </button>
              <SubmitButton
                className="btn btn--sm"
                pendingLabel="Abandon en cours…"
                icon="ph-circle-dashed"
                style={{
                  background: "var(--color-danger)",
                  color: "#fff",
                  borderColor: "var(--color-danger)",
                }}
              >
                Confirmer l&apos;abandon
              </SubmitButton>
            </div>
          </form>
        </div>
      </Dialog>
    </section>
  );
}
