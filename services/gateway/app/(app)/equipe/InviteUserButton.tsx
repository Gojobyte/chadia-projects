"use client";

import { useState, useTransition } from "react";

type Role = "ADMIN" | "DIRECTEUR" | "FINANCIER" | "MEMBRE";

interface Props {
  createAction: (formData: FormData) => Promise<{ ok: boolean; generatedPassword?: string | null; error?: string }>;
}

/**
 * Bouton "Inviter un membre" + modal de création.
 *
 * Cycle :
 *  1. Admin remplit email + nom + rôle (+ optionnellement fonction/zone)
 *  2. Le Server Action createUser appelle /auth/users côté auth-service
 *  3. Si le mot de passe n'a pas été fourni, le backend en génère un et le
 *     renvoie UNE SEULE FOIS — on l'affiche à l'admin pour qu'il puisse le
 *     transmettre au nouveau membre (à terme : envoi par email automatique)
 */
export function InviteUserButton({ createAction }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pwd, setPwd] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPwd(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "");
    startTransition(async () => {
      try {
        const result = await createAction(fd);
        if (!result.ok) {
          setError(result.error || "Erreur de création");
          return;
        }
        setCreatedName(name);
        if (result.generatedPassword) {
          setPwd(result.generatedPassword);
        } else {
          // Pas de password généré (admin a fourni le sien) → on ferme directement
          setOpen(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  }

  function close() {
    setOpen(false);
    setError(null);
    setPwd(null);
    setCreatedName(null);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn--accent btn--sm">
        <i className="ph ph-user-plus" aria-hidden="true"></i> Inviter un membre
      </button>

      {open ? (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="modal-frame">
            <header className="modal-h">
              <div>
                <div className="modal-eb">Gestion des membres</div>
                <h3 className="modal-t">
                  Inviter un <em>nouveau membre</em>
                </h3>
              </div>
              <button type="button" onClick={close} className="btn btn--ghost btn--sm" title="Fermer">
                <i className="ph ph-x" aria-hidden="true"></i>
              </button>
            </header>

            {pwd ? (
              // Écran de confirmation avec le mot de passe à transmettre
              <div className="modal-body">
                <div className="modal-success">
                  <i className="ph-fill ph-check-circle" aria-hidden="true"></i>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--color-ink)" }}>
                      Membre créé : {createdName}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-stone)", marginTop: 2 }}>
                      Transmets le mot de passe ci-dessous à ce membre (affiché une seule fois).
                    </div>
                  </div>
                </div>
                <div className="pwd-box">
                  <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 6 }}>
                    Mot de passe temporaire
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--color-ink)", background: "var(--color-canvas)", padding: "8px 12px", borderRadius: 6 }}>
                      {pwd}
                    </code>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => navigator.clipboard.writeText(pwd)}
                    >
                      <i className="ph ph-copy" aria-hidden="true"></i> Copier
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn--accent btn--sm" onClick={close}>
                    Terminé
                  </button>
                </div>
              </div>
            ) : (
              // Formulaire de création
              <form onSubmit={submit} className="modal-body">
                <div className="modal-grid">
                  <div className="field-uc span-2">
                    <span className="label">Nom complet</span>
                    <input className="input" name="name" required placeholder="Aïssatou Saleh" />
                  </div>
                  <div className="field-uc span-2">
                    <span className="label">E-mail professionnel</span>
                    <input className="input" name="email" type="email" required placeholder="prenom.nom@ong-chadia.com" />
                  </div>
                  <div className="field-uc">
                    <span className="label">Rôle</span>
                    <select className="input" name="role" defaultValue="MEMBRE" required>
                      <option value="MEMBRE">Membre · accès opérationnel</option>
                      <option value="FINANCIER">Financier · validation budgets</option>
                      <option value="ADMIN">Admin · gestion plateforme</option>
                      <option value="DIRECTEUR">Directeur · accès total</option>
                    </select>
                  </div>
                  <div className="field-uc">
                    <span className="label">Instance</span>
                    <select className="input" name="instance" defaultValue="PROGRAMMES">
                      <option value="CA">Conseil d&apos;administration</option>
                      <option value="BUREAU">Bureau Exécutif</option>
                      <option value="PROGRAMMES">Programmes</option>
                      <option value="VOLONTAIRE">Volontaires & stagiaires</option>
                      <option value="EXTERNE">Externe / Plateforme</option>
                    </select>
                  </div>
                  <div className="field-uc">
                    <span className="label">Fonction (libre)</span>
                    <input className="input" name="fonction" placeholder="Chargée de programme WASH" />
                  </div>
                  <div className="field-uc">
                    <span className="label">Zone d&apos;intervention</span>
                    <input className="input" name="zone" placeholder="Mongo, Guéra" />
                  </div>
                  <div className="field-uc span-2">
                    <span className="label">Téléphone (optionnel)</span>
                    <input className="input" name="telephone" placeholder="+235 65 62 62 40" />
                  </div>
                  <div className="field-uc span-2">
                    <span className="label">Mot de passe (laisser vide pour génération automatique)</span>
                    <input className="input mono" name="password" type="text" placeholder="Auto-généré si vide" />
                    <span className="help">
                      Si vide, on génère un mot de passe aléatoire et tu pourras le copier après création.
                    </span>
                  </div>
                </div>

                {error ? (
                  <div className="modal-error">
                    <i className="ph ph-warning-circle" aria-hidden="true"></i> {error}
                  </div>
                ) : null}

                <div className="modal-foot">
                  <button type="button" onClick={close} className="btn btn--ghost btn--sm">
                    Annuler
                  </button>
                  <button type="submit" disabled={pending} className="btn btn--accent btn--sm">
                    {pending ? (
                      <>
                        <i className="ph ph-circle-notch" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true"></i>
                        Création…
                      </>
                    ) : (
                      <>
                        <i className="ph ph-user-plus" aria-hidden="true"></i> Créer le membre
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <style jsx>{`
            .modal-backdrop {
              position: fixed; inset: 0;
              background: rgba(26, 22, 18, 0.55);
              backdrop-filter: blur(4px);
              z-index: 200;
              display: grid; place-items: center;
              padding: 24px;
            }
            .modal-frame {
              background: var(--color-surface);
              border-radius: 12px;
              width: 100%;
              max-width: 560px;
              max-height: 90vh;
              display: flex; flex-direction: column;
              box-shadow: 0 24px 60px -20px rgba(26, 22, 18, 0.4);
              overflow: hidden;
            }
            .modal-h {
              padding: 16px 20px;
              border-bottom: 1px solid var(--color-line);
              background: var(--color-surface-2);
              display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
            }
            .modal-eb {
              font-size: 10px;
              letter-spacing: 0.14em;
              color: var(--color-stone);
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .modal-t {
              font-family: var(--font-display);
              font-size: 22px;
              font-weight: 400;
              color: var(--color-ink);
              margin: 0;
              line-height: 1.1;
            }
            .modal-t em { font-style: italic; color: var(--color-terracotta); }
            .modal-body {
              padding: 20px;
              display: flex; flex-direction: column; gap: 16px;
              overflow-y: auto;
            }
            .modal-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
            }
            .modal-grid .span-2 { grid-column: 1 / -1; }
            .modal-error {
              background: var(--color-danger-soft);
              color: var(--color-danger);
              border: 1px solid rgba(163, 45, 45, 0.18);
              border-radius: 6px;
              padding: 8px 12px;
              font-size: 13px;
              display: flex; align-items: center; gap: 8px;
            }
            .modal-success {
              background: var(--color-success-soft);
              color: var(--color-success);
              border: 1px solid rgba(91, 138, 58, 0.24);
              border-radius: 6px;
              padding: 10px 12px;
              font-size: 13px;
              display: flex; align-items: center; gap: 10px;
            }
            .modal-success > i { font-size: 22px; }
            .pwd-box {
              background: var(--color-canvas);
              border: 1px dashed var(--color-line-strong);
              border-radius: 8px;
              padding: 14px;
            }
            .modal-foot {
              display: flex; justify-content: space-between; gap: 8px;
              padding-top: 12px;
              border-top: 1px solid var(--color-line);
              margin-top: 4px;
            }
            @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : null}
    </>
  );
}
