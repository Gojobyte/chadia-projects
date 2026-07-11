import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

type UserRole = "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";

const ROLE_LABEL: Record<UserRole, string> = {
  DIRECTEUR: "Directrice générale",
  ADMIN: "Administrateur·rice",
  FINANCIER: "Responsable financier",
  MEMBRE: "Membre de l'équipe",
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  DIRECTEUR:
    "Accès total · publication d'AO, validation des dossiers, gestion des utilisateurs et signature des conventions. Audit log activé.",
  ADMIN:
    "Administration plateforme · gestion des paramètres, des intégrations et des permissions de l'organisation.",
  FINANCIER:
    "Volet financier · validation des budgets, suivi des décaissements et rapprochements bancaires.",
  MEMBRE:
    "Membre opérationnel · contribution aux dossiers candidatures et projets, sans accès aux paramètres sensibles.",
};

function initials(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function splitName(name: string | null | undefined): { first: string; last: string } {
  if (!name) return { first: "Utilisateur", last: "" };
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function fmtRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 3600) return `il y a ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default async function MonComptePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const user = session.user;
  const role: UserRole = (user.role ?? "MEMBRE") as UserRole;
  const { first, last } = splitName(user.name);

  // Stats du portefeuille — récupérées en best-effort. Si les endpoints
  // remontent une erreur on retombe sur des valeurs neutres.
  let candidatures: Array<{ id: string; statut: string; createdAt: string; titre: string; reference: string }> = [];
  let projets: Array<{ id: string; statut: string; bailleurs: string[]; createdAt: string; updatedAt: string; titre: string }> = [];
  try {
    const data = await TenderAPI.listCandidatures({}, token);
    candidatures = data.candidatures ?? [];
  } catch {
    /* silencieux */
  }
  try {
    const data = await TenderAPI.listProjets({}, token);
    projets = data.projets ?? [];
  } catch {
    /* silencieux */
  }

  const candidaturesAttribuees = candidatures.filter((c) => c.statut === "ATTRIBUEE").length;
  const candidaturesSoumises = candidatures.filter((c) =>
    ["SOUMISE", "ATTRIBUEE", "NON_RETENUE"].includes(c.statut),
  ).length;
  const successRate =
    candidaturesSoumises > 0 ? Math.round((candidaturesAttribuees / candidaturesSoumises) * 100) : 0;

  const allBailleurs = new Set<string>();
  for (const p of projets) for (const b of p.bailleurs) allBailleurs.add(b);
  const bailleursList = [...allBailleurs].slice(0, 4);

  // Volume mobilisé : somme des budgets demandés sur les candidatures soumises
  // — donnée approximative qui sera affinée quand on aura la table budgets.

  // Pour la timeline d'activité on prend les 4 dernières actions (candidature
  // créée ou projet modifié), triées par date.
  const activity = [
    ...candidatures.slice(0, 3).map((c) => ({
      kind: c.statut === "ATTRIBUEE" ? ("ok" as const) : ("ter" as const),
      when: new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      body: (
        <>
          {c.statut === "ATTRIBUEE" ? "Candidature " : "Candidature créée "}
          <strong>{c.reference}</strong>
          {" · "}
          {c.titre.slice(0, 60)}
        </>
      ),
    })),
    ...projets.slice(0, 2).map((p) => ({
      kind: "ok" as const,
      when: new Date(p.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      body: (
        <>
          Mise à jour du projet <strong>{p.titre.slice(0, 50)}</strong>
        </>
      ),
    })),
  ].slice(0, 4);

  return (
    <div className="pg">
      {/* === Page header sobre — la cover prend le relais visuel === */}
      <div style={{ marginBottom: 20 }}>
        <div className="pg-eyebrow">
          <Link href="/equipe" style={{ color: "var(--color-stone)", textDecoration: "none" }}>
            Espace de travail
          </Link>
          {" · "}Mon profil
        </div>
      </div>

      {/* === Cover + identité === */}
      <div className="prof-cover" aria-hidden="true"></div>
      <div className="prof-card">
        <div className="prof-head">
          <div className="av-frame">
            <div className="avatar avatar--xl avatar--terracotta" style={{ width: 92, height: 92, fontSize: 30 }}>
              {initials(user.name)}
            </div>
          </div>
          <div className="meta-block">
            <h1>
              {first} <em>{last}.</em>
            </h1>
            <div className="role">
              {ROLE_LABEL[role]} · CHADIA Projects
            </div>
            <div className="org">
              N&apos;Djaména · Tchad · {user.email}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            <button type="button" className="btn btn--secondary btn--sm" disabled aria-disabled="true">
              <i className="ph ph-camera" aria-hidden="true"></i> Changer la photo
            </button>
            <button type="button" className="btn btn--accent btn--sm" disabled aria-disabled="true">
              <i className="ph ph-pencil-simple" aria-hidden="true"></i> Modifier le profil
            </button>
          </div>
        </div>

        <div className="prof-stats">
          <div className="st">
            <div className="l">Projets pilotés</div>
            <div className="v">
              {projets.length}
              <em>+</em>
            </div>
            <div className="d">depuis 2018</div>
          </div>
          <div className="st">
            <div className="l">Réponses AO déposées</div>
            <div className="v">{candidaturesSoumises}</div>
            <div className="d">taux de succès {successRate} %</div>
          </div>
          <div className="st">
            <div className="l">Bailleurs gérés</div>
            <div className="v">{allBailleurs.size}</div>
            <div className="d">{bailleursList.join(", ") || "—"}</div>
          </div>
          <div className="st">
            <div className="l">Volume mobilisé</div>
            <div className="v">
              {projets.reduce((s) => s + 0, 0) ? "—" : "—"}
              <em></em>
            </div>
            <div className="d">FCFA · à connecter</div>
          </div>
        </div>
      </div>

      {/* === Tabs === */}
      <div className="priv-tabs" role="tablist">
        <button type="button" className="priv-tab on" role="tab" aria-selected="true">
          Aperçu
        </button>
        <button type="button" className="priv-tab" role="tab" disabled aria-disabled="true">
          Informations personnelles
        </button>
        <button type="button" className="priv-tab" role="tab" disabled aria-disabled="true">
          Sécurité &amp; mot de passe
        </button>
        <button type="button" className="priv-tab" role="tab" disabled aria-disabled="true">
          Préférences &amp; notifications
        </button>
        <button type="button" className="priv-tab" role="tab" disabled aria-disabled="true">
          Sessions &amp; appareils
        </button>
      </div>

      <div className="prof-grid">
        {/* === Colonne principale === */}
        <div>
          {/* Infos personnelles */}
          <div className="card" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "var(--color-ink)", margin: 0 }}>
                Informations <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>personnelles</em>
              </h3>
              <button type="button" className="btn btn--ghost btn--sm" disabled aria-disabled="true">
                <i className="ph ph-pencil-simple" aria-hidden="true"></i> Modifier
              </button>
            </div>
            <div className="form-grid">
              <div className="field-uc">
                <span className="label">Prénom</span>
                <input className="input" defaultValue={first} disabled />
              </div>
              <div className="field-uc">
                <span className="label">Nom</span>
                <input className="input" defaultValue={last} disabled />
              </div>
              <div className="field-uc">
                <span className="label">E-mail professionnel</span>
                <input className="input" type="email" defaultValue={user.email ?? ""} disabled />
              </div>
              <div className="field-uc">
                <span className="label">Téléphone</span>
                <input className="input" placeholder="+235 65 62 62 40" disabled />
              </div>
              <div className="field-uc">
                <span className="label">Fonction</span>
                <input className="input" defaultValue={ROLE_LABEL[role]} disabled />
              </div>
              <div className="field-uc">
                <span className="label">Département</span>
                <select className="input" disabled defaultValue="direction">
                  <option value="direction">Direction</option>
                  <option value="programmes">Programmes</option>
                  <option value="finance">Finance</option>
                  <option value="rh">RH</option>
                </select>
              </div>
              <div className="field-uc span-2">
                <span className="label">Biographie courte · visible par l&apos;équipe</span>
                <textarea
                  rows={3}
                  disabled
                  placeholder="Quelques lignes sur votre parcours et votre rôle dans l'ONG…"
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
                <span style={{ fontSize: 12, color: "var(--color-stone)" }}>
                  L&apos;édition du profil sera disponible quand l&apos;endpoint <code>/api/me</code> sera branché.
                </span>
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "var(--color-ink)", margin: "0 0 16px" }}>
              <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>Sécurité</em> &amp; accès
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <SecurityRow
                title="Mot de passe"
                desc="Authentification via Google Workspace · délégué OAuth"
                right={<span className="badge badge--review"><span className="dot"></span>Géré par Google</span>}
              />
              <SecurityRow
                title="Double authentification"
                desc="Activée sur le compte Google associé"
                right={<span className="badge badge--published"><span className="dot"></span>Activée</span>}
              />
              <SecurityRow
                title="Clé d'API personnelle"
                desc="Pour les intégrations futures · pas encore générée"
                right={
                  <button type="button" className="btn btn--ghost btn--sm" disabled aria-disabled="true">
                    <i className="ph ph-key" aria-hidden="true"></i> Générer
                  </button>
                }
              />
              <SecurityRow
                title="Sessions actives"
                desc="Session courante uniquement · pas de gestion multi-appareils activée"
                right={
                  <button type="button" className="btn btn--ghost btn--sm" disabled aria-disabled="true" style={{ color: "var(--color-danger)" }}>
                    <i className="ph ph-sign-out" aria-hidden="true"></i> Déconnecter tout
                  </button>
                }
                isLast
              />
            </div>
          </div>

          {/* Préférences */}
          <div className="card">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "var(--color-ink)", margin: "0 0 16px" }}>
              <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>Préférences</em>
            </h3>
            <div className="form-grid">
              <div className="field-uc">
                <span className="label">Langue de l&apos;interface</span>
                <select className="input" disabled defaultValue="fr">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
              <div className="field-uc">
                <span className="label">Fuseau horaire</span>
                <select className="input" disabled defaultValue="ndjamena">
                  <option value="ndjamena">Afrique/N&apos;Djaména (UTC+1)</option>
                  <option value="paris">Europe/Paris (UTC+2)</option>
                </select>
              </div>
              <div className="field-uc">
                <span className="label">Format des dates</span>
                <select className="input" disabled defaultValue="long">
                  <option value="long">14 mai 2026</option>
                  <option value="short">14/05/2026</option>
                  <option value="iso">2026-05-14</option>
                </select>
              </div>
              <div className="field-uc">
                <span className="label">Devise principale</span>
                <select className="input" disabled defaultValue="FCFA">
                  <option value="FCFA">FCFA</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="field-uc span-2">
                <span className="label">Notifications</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" defaultChecked disabled /> Clôture d&apos;appel d&apos;offres dans les 7 jours
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" defaultChecked disabled /> Nouvelle opportunité collectée par le service de veille
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" defaultChecked disabled /> Suggestion IA sur un de mes dossiers
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" disabled /> Résumé hebdomadaire du portefeuille
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" disabled /> Mises à jour produit CHADIA
                  </label>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-stone)" }}>
                  La gestion fine des notifications sera activable une fois le service notification branché côté UI.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* === Side rail === */}
        <aside>
          {/* Rôle & permissions */}
          <div className="side-w">
            <h4>
              Rôle &amp; <span className="sub">permissions</span>
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--color-sepia)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ph ph-shield-check" style={{ color: "var(--color-terracotta)" }} aria-hidden="true"></i>
                <strong style={{ color: "var(--color-ink)" }}>{ROLE_LABEL[role]}</strong>
              </div>
              <div style={{ color: "var(--color-stone)", lineHeight: 1.55 }}>
                {ROLE_DESCRIPTION[role]}
              </div>
              <Link
                href="/equipe"
                className="btn btn--ghost btn--sm"
                style={{ alignSelf: "flex-start", marginTop: 4, padding: 0, height: "auto" }}
              >
                Voir la matrice complète <i className="ph ph-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
          </div>

          {/* Compétences */}
          <div className="side-w">
            <h4>
              Compétences <span className="sub">métier</span>
            </h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="skill">
                Montage AO
                <span className="lvl">
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                </span>
              </span>
              <span className="skill">
                PRAG UE
                <span className="lvl">
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                  <span></span>
                </span>
              </span>
              <span className="skill">
                Genre &amp; protection
                <span className="lvl">
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                  <span></span>
                  <span></span>
                </span>
              </span>
              <span className="skill">
                WASH
                <span className="lvl">
                  <span className="on"></span>
                  <span className="on"></span>
                  <span className="on"></span>
                  <span></span>
                  <span></span>
                </span>
              </span>
              <span className="skill">
                Plaidoyer
                <span className="lvl">
                  <span className="on"></span>
                  <span className="on"></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 10 }}>
              Compétences éditables quand le profil sera activable côté backend.
            </div>
          </div>

          {/* Activité récente */}
          <div className="side-w">
            <h4>
              Activité <span className="sub">récente</span>
            </h4>
            {activity.length > 0 ? (
              <div className="tl">
                {activity.map((a, i) => (
                  <div key={i} className={`tl-item ${a.kind}`}>
                    <div className="when">{a.when}</div>
                    <div className="body">{a.body}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>
                Aucune activité pour l&apos;instant — créez une candidature ou un projet pour démarrer.
              </p>
            )}
          </div>

          {/* Session / dispositif courant (peu d'infos pour l'instant) */}
          <div className="side-w">
            <h4>
              Session <span className="sub">courante</span>
            </h4>
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-stone)" }}>Compte</span>
                <span style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>
                  {user.email}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-stone)" }}>Rôle</span>
                <span style={{ color: "var(--color-ink)" }}>{role}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SecurityRow({
  title,
  desc,
  right,
  isLast,
}: {
  title: string;
  desc: string;
  right: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: isLast ? "none" : "1px solid var(--color-line)",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ color: "var(--color-ink)", fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--color-stone)", marginTop: 2 }}>{desc}</div>
      </div>
      <div>{right}</div>
    </div>
  );
}
