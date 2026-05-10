import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TenderAPI, NotifAPI } from "@/lib/api";

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: "badge--draft",
  PUBLIE: "badge--published",
  EN_COURS: "badge--review",
  CLOTURE: "badge--closed",
  EN_EVALUATION: "badge--review",
  ATTRIBUE: "badge--awarded",
  ANNULE: "badge--canceled",
  ARCHIVE: "badge--closed",
};

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "Évaluation", ATTRIBUE: "À attribuer",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

interface AO {
  id: string; reference: string; titre: string; statut: string;
  dateLimiteDepot: string;
  bailleur?: { sigle: string; nom?: string };
  secteur?: string;
  budget?: number;
  _count?: { soumissions: number };
}

interface Notif {
  id: string;
  titre: string;
  message: string;
  createdAt?: string;
  niveau?: "DANGER" | "WARNING" | "INFO";
}

function fmtMoneyM(n: number): string {
  if (!n) return "—";
  const m = n / 1_000_000;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(m)} M FCFA`;
}

function deadlineLabel(date: string): { tone: "urgent" | "warn" | "ok"; primary: string; secondary: string } {
  const ms = new Date(date).getTime() - Date.now();
  const hours = Math.ceil(ms / 36e5);
  const days = Math.ceil(ms / 864e5);
  if (hours <= 0) return { tone: "urgent", primary: "Clôturé", secondary: "passé" };
  if (hours < 48) return { tone: "urgent", primary: `${hours}h restantes`, secondary: "clôture imminente" };
  if (days <= 7) return { tone: "warn", primary: `${days} jours`, secondary: "avant clôture" };
  return { tone: "ok", primary: `${days} jours`, secondary: "avant clôture" };
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  let kpis = {
    totalAO: 0, actifs: 0, attribues: 0, tauxAttribution: 0,
    totalSoumissions: 0, totalFournisseurs: 0,
    budgetTotal: 0, budgetAttribue: 0,
  };
  let appelsOffres: AO[] = [];
  let notifications: Notif[] = [];

  if (token) {
    const [analytics, aoList, notifs] = await Promise.allSettled([
      TenderAPI.getAnalytics(token),
      TenderAPI.listAppelsOffres({ limit: "5" }),
      NotifAPI.listNotifications(session.user.id, token),
    ]);
    if (analytics.status === "fulfilled" && analytics.value?.kpis) kpis = analytics.value.kpis;
    if (aoList.status === "fulfilled") appelsOffres = aoList.value?.appelsOffres ?? [];
    if (notifs.status === "fulfilled") notifications = notifs.value?.notifications ?? [];
  }

  const firstName = session.user.name?.split(" ")[0] ?? "";
  const now = new Date();
  const dateLong = DATE_FMT.format(now);
  const heure = TIME_FMT.format(now);
  const jour = now.getDate();
  const mois = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const aClotures = appelsOffres.filter((ao) => {
    const j = Math.ceil((new Date(ao.dateLimiteDepot).getTime() - Date.now()) / 864e5);
    return j >= 0 && j <= 7;
  });
  const budgetPct = kpis.budgetTotal > 0 ? Math.round((kpis.budgetAttribue / kpis.budgetTotal) * 100) : 0;

  return (
    <div className="pg">
      <div className="pg-h">
        <div>
          <div className="pg-eyebrow">{dateLong} · {heure}</div>
          <h1 className="pg-title">Bonjour <em>{firstName}.</em></h1>
          <p className="pg-sub">
            Voici l&apos;état du portefeuille. {kpis.actifs} appel{kpis.actifs > 1 ? "s" : ""} d&apos;offres actif{kpis.actifs > 1 ? "s" : ""},
            {" "}{aClotures.length} clôture{aClotures.length > 1 ? "s" : ""} programmée{aClotures.length > 1 ? "s" : ""} dans les sept jours,
            {" "}taux d&apos;attribution {kpis.tauxAttribution}%.
          </p>
        </div>
        <div className="pg-actions">
          <Link href="/appels-offres" className="btn btn--secondary btn--sm">
            <i className="ph ph-list" aria-hidden="true"></i> Tous les AO
          </Link>
          <Link href="/appels-offres/nouveau" className="btn btn--accent btn--sm">
            <i className="ph ph-plus" aria-hidden="true"></i> Nouvel appel d&apos;offres
          </Link>
        </div>
      </div>

      <div className="briefing">
        <div className="b-date">{jour} <small>{mois}</small></div>
        <div className="b-msg">
          {aClotures.length > 0 ? (
            <>
              <strong>{aClotures.length} clôture{aClotures.length > 1 ? "s" : ""} programmée{aClotures.length > 1 ? "s" : ""} dans les sept jours.</strong>{" "}
              {aClotures[0] && (
                <>L&apos;AO <em>{aClotures[0].titre}</em> ferme le {new Date(aClotures[0].dateLimiteDepot).toLocaleDateString("fr-FR")}.</>
              )}
            </>
          ) : (
            <><strong>Aucune clôture imminente.</strong> Le portefeuille est aligné sur les jalons prévus.</>
          )}
          {kpis.budgetTotal > 0 && (
            <> <strong>Budget engagé :</strong> {budgetPct} % du plafond annuel atteint.</>
          )}
        </div>
        <Link href="/analytics" className="btn btn--secondary btn--sm">Ouvrir l&apos;agenda</Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi kpi--accent">
          <span className="kpi-label">Appels d&apos;offres actifs</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.actifs}</span>
            <span className="kpi-trend up"><i className="ph ph-arrow-up"></i>sur {kpis.totalAO}</span>
          </div>
          <span className="kpi-help">portefeuille total</span>
          <svg className="kpi-spark" viewBox="0 0 84 28" preserveAspectRatio="none">
            <path className="area" d="M0,22 L0,18 L12,15 L24,17 L36,12 L48,14 L60,9 L72,11 L84,6 L84,28 L0,28 Z"/>
            <path d="M0,18 L12,15 L24,17 L36,12 L48,14 L60,9 L72,11 L84,6"/>
          </svg>
        </div>

        <div className="kpi">
          <span className="kpi-label">Soumissions reçues</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.totalSoumissions}</span>
            <span className="kpi-trend up">
              <i className="ph ph-arrow-up"></i>
              {kpis.totalAO > 0 ? `~${(kpis.totalSoumissions / kpis.totalAO).toFixed(1)}/AO` : "—"}
            </span>
          </div>
          <span className="kpi-help">moyenne par appel</span>
          <svg className="kpi-spark" viewBox="0 0 84 28" preserveAspectRatio="none">
            <path className="area" d="M0,20 L12,17 L24,19 L36,14 L48,16 L60,11 L72,8 L84,10 L84,28 L0,28 Z"/>
            <path d="M0,20 L12,17 L24,19 L36,14 L48,16 L60,11 L72,8 L84,10"/>
          </svg>
        </div>

        <div className="kpi">
          <span className="kpi-label">Taux d&apos;attribution</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{kpis.tauxAttribution}<em>%</em></span>
            <span className={`kpi-trend ${kpis.tauxAttribution >= 70 ? "up" : "down"}`}>
              <i className={`ph ph-arrow-${kpis.tauxAttribution >= 70 ? "up" : "down"}`}></i>
              {kpis.attribues} attrib.
            </span>
          </div>
          <span className="kpi-help">cible 78 % à fin juin</span>
          <svg className="kpi-spark" viewBox="0 0 84 28" preserveAspectRatio="none">
            <path className="area" d="M0,8 L12,10 L24,9 L36,12 L48,11 L60,14 L72,13 L84,16 L84,28 L0,28 Z"/>
            <path d="M0,8 L12,10 L24,9 L36,12 L48,11 L60,14 L72,13 L84,16"/>
          </svg>
        </div>

        <div className="kpi">
          <span className="kpi-label">Budget engagé · 2026</span>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {kpis.budgetTotal > 0 ? (
                <>{(kpis.budgetTotal / 1_000_000_000).toFixed(1)}<em>md</em></>
              ) : (
                <>0<em>md</em></>
              )}
            </span>
            <span className="kpi-trend up"><i className="ph ph-arrow-up"></i>{budgetPct} %</span>
          </div>
          <span className="kpi-help">FCFA · attribué {fmtMoneyM(kpis.budgetAttribue)}</span>
          <svg className="kpi-spark" viewBox="0 0 84 28" preserveAspectRatio="none">
            <path className="area" d="M0,24 L12,22 L24,19 L36,17 L48,13 L60,11 L72,9 L84,5 L84,28 L0,28 Z"/>
            <path d="M0,24 L12,22 L24,19 L36,17 L48,13 L60,11 L72,9 L84,5"/>
          </svg>
        </div>
      </div>

      <div className="dash-row">
        <section>
          <div className="sec-h">
            <h3>À <em>traiter</em> aujourd&apos;hui</h3>
            <span className="meta">{appelsOffres.length} dossier{appelsOffres.length > 1 ? "s" : ""} · trié par urgence</span>
          </div>

          {appelsOffres.length === 0 ? (
            <div className="empty">
              <div className="ic"><i className="ph ph-gavel" aria-hidden="true"></i></div>
              <h3 className="t">Pas encore d&apos;<em>appel d&apos;offres</em></h3>
              <p className="s">Lancez votre premier appel d&apos;offres pour publier vos besoins et collecter des soumissions.</p>
              <Link href="/appels-offres/nouveau" className="btn btn--primary">
                <i className="ph ph-plus" aria-hidden="true"></i> Créer un appel d&apos;offres
              </Link>
            </div>
          ) : (
            <div className="ao-list">
              {appelsOffres.map((ao) => {
                const dl = deadlineLabel(ao.dateLimiteDepot);
                return (
                  <Link key={ao.id} href={`/appels-offres/${ao.id}`} className="ao-item">
                    <span className="ref">{ao.reference}</span>
                    <div>
                      <div className="title">{ao.titre}</div>
                      <div className="meta">
                        {ao.bailleur?.sigle && <span><i className="ph ph-buildings"></i> {ao.bailleur.sigle}</span>}
                        {ao.secteur && <span><i className="ph ph-tag"></i> {ao.secteur}</span>}
                        {ao.budget != null && ao.budget > 0 && (
                          <span><i className="ph ph-currency-circle-dollar"></i> {fmtMoneyM(ao.budget)}</span>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${STATUT_BADGE[ao.statut] ?? "badge--draft"}`}>
                      <span className="dot"></span>{STATUT_LABEL[ao.statut] ?? ao.statut}
                    </span>
                    <span className="deadline">
                      {dl.tone === "urgent" ? (
                        <span className="urgent">{dl.primary}</span>
                      ) : (
                        <span style={{ color: dl.tone === "warn" ? "var(--color-warning)" : undefined }}>{dl.primary}</span>
                      )}
                      <small>{dl.secondary}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Link href="/appels-offres" className="btn btn--ghost btn--sm">
              Voir les {kpis.totalAO} appels d&apos;offres <i className="ph ph-arrow-right"></i>
            </Link>
          </div>
        </section>

        <aside>
          <div className="rail-card">
            <h4>Alertes</h4>
            <p className="sub">
              {notifications.length > 0
                ? `${notifications.length} notification${notifications.length > 1 ? "s" : ""}`
                : "Aucune alerte active"}
            </p>

            {notifications.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--color-stone)" }}>
                <i className="ph ph-bell-slash" style={{ fontSize: 22, color: "var(--color-mineral)", display: "block", marginBottom: 6 }}></i>
                Aucune notification à traiter.
              </div>
            ) : (
              notifications.slice(0, 4).map((n) => {
                const tone = n.niveau === "DANGER" ? "danger" : n.niveau === "WARNING" ? "warning" : "info";
                const icon = tone === "danger" ? "ph-warning" : tone === "warning" ? "ph-clock-countdown" : "ph-bell-ringing";
                return (
                  <div key={n.id} className="alert-row">
                    <div className={`alert-icon ${tone}`}><i className={`ph ${icon}`}></i></div>
                    <div className="body">
                      <p><strong>{n.titre}</strong> {n.message}</p>
                      {n.createdAt && (
                        <small>{new Date(n.createdAt).toLocaleString("fr-FR")}</small>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="rail-card">
            <h4>Recherche <em>universelle</em></h4>
            <p className="sub">⌘ K · partout</p>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--color-sepia)", margin: 0 }}>
              Trouver un appel d&apos;offres, un fournisseur, ou exécuter une action depuis n&apos;importe quelle page.
            </p>
          </div>
        </aside>
      </div>

      <div className="dash-row dash-row--even">
        <div className="rail-card" style={{ margin: 0 }}>
          <h4>Engagement <em>budgétaire</em></h4>
          <p className="sub">Au {now.toLocaleDateString("fr-FR")}</p>
          {kpis.budgetTotal > 0 ? (
            <div className="budget-bars">
              <div className="bar-row">
                <span className="lbl">Attribué</span>
                <div className="bar"><div className="bar-fill" style={{ width: `${budgetPct}%` }}></div></div>
                <span className="val">{fmtMoneyM(kpis.budgetAttribue)}</span>
              </div>
              <div className="bar-row">
                <span className="lbl">Total</span>
                <div className="bar"><div className="bar-fill ink" style={{ width: "100%" }}></div></div>
                <span className="val">{fmtMoneyM(kpis.budgetTotal)}</span>
              </div>
              <div className="bar-row">
                <span className="lbl">Disponible</span>
                <div className="bar">
                  <div
                    className="bar-fill stone"
                    style={{ width: `${100 - budgetPct}%` }}
                  ></div>
                </div>
                <span className="val">{fmtMoneyM(kpis.budgetTotal - kpis.budgetAttribue)}</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--color-stone)" }}>Aucun budget renseigné pour l&apos;exercice en cours.</p>
          )}
        </div>

        <div className="rail-card" style={{ margin: 0 }}>
          <h4>Volume <em>opérationnel</em></h4>
          <p className="sub">État des collections</p>
          <table className="mini-tbl">
            <thead>
              <tr>
                <th>Indicateur</th>
                <th style={{ textAlign: "right" }}>Valeur</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fournisseurs référencés</td>
                <td className="num">{kpis.totalFournisseurs}</td>
              </tr>
              <tr>
                <td>Soumissions cumulées</td>
                <td className="num">{kpis.totalSoumissions}</td>
              </tr>
              <tr>
                <td>Marchés attribués</td>
                <td className="num success">{kpis.attribues}</td>
              </tr>
              <tr>
                <td>Appels en évaluation</td>
                <td className="num warning">{kpis.actifs - kpis.attribues}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 14 }}>
            <Link href="/fournisseurs" className="btn btn--ghost btn--sm">
              Annuaire complet <i className="ph ph-arrow-right"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
