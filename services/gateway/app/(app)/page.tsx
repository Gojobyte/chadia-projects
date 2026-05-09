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
  ARCHIVE: "badge--archived",
};

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "En évaluation", ATTRIBUE: "Attribué",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

interface AO {
  id: string; reference: string; titre: string; statut: string;
  dateLimiteDepot: string;
  bailleur?: { sigle: string; nom?: string };
  _count?: { soumissions: number };
}

interface Notif { id: string; titre: string; message: string; createdAt?: string }

function fmtMoney(n: number, cur = "FCFA"): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 864e5);
}

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  let kpis = { totalAO: 0, actifs: 0, attribues: 0, tauxAttribution: 0, totalSoumissions: 0, totalFournisseurs: 0, budgetTotal: 0, budgetAttribue: 0 };
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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Tableau de bord</div>
          <h1 className="page-title">Bonjour <em>{firstName}</em></h1>
          <p className="page-subtitle">
            <span className="tabular-nums">{kpis.actifs}</span> appels d&apos;offres actifs ·{" "}
            <span className="tabular-nums">{kpis.totalSoumissions}</span> soumissions ·{" "}
            <span className="tabular-nums">{kpis.tauxAttribution}%</span> taux d&apos;attribution
          </p>
        </div>
        <div className="page-actions">
          <Link href="/appels-offres" className="btn btn--secondary">
            <i className="ph ph-list" aria-hidden="true"></i>
            Tous les AO
          </Link>
          <Link href="/appels-offres/nouveau" className="btn btn--primary">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Nouvel appel d&apos;offre
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="lbl">Appels d&apos;offres actifs</div>
          <div className="val tabular-nums">{kpis.actifs}</div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            sur {kpis.totalAO} au total
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Soumissions reçues</div>
          <div className="val tabular-nums">{kpis.totalSoumissions}</div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            {kpis.totalFournisseurs} fournisseurs
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Marchés attribués</div>
          <div className="val tabular-nums">{kpis.attribues}</div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            <span className="tabular-nums">{kpis.tauxAttribution}%</span> de taux
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Budget engagé</div>
          <div className="val">
            {kpis.budgetTotal > 0
              ? <>{new Intl.NumberFormat("fr-FR").format(Math.round(kpis.budgetTotal / 1_000_000))}<span className="unit"> M</span></>
              : <>0<span className="unit"> FCFA</span></>}
          </div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            {fmtMoney(kpis.budgetAttribue)} attribué
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h2 className="section-title">Appels d&apos;offres récents</h2>
            <Link href="/appels-offres" className="btn--link">Voir tous →</Link>
          </div>

          {appelsOffres.length === 0 ? (
            <div className="empty">
              <div className="ic"><i className="ph ph-gavel" aria-hidden="true"></i></div>
              <h3 className="t">Pas encore d&apos;<em>appel d&apos;offre</em></h3>
              <p className="s">Lancez votre premier appel d&apos;offre pour publier vos besoins et collecter des soumissions.</p>
              <Link href="/appels-offres/nouveau" className="btn btn--primary">
                <i className="ph ph-plus" aria-hidden="true"></i>
                Créer un appel d&apos;offre
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {appelsOffres.map((ao) => {
                const days = daysUntil(ao.dateLimiteDepot);
                const isUrgent = days <= 7 && days >= 0;
                return (
                  <Link key={ao.id} href={`/appels-offres/${ao.id}`} className="card card--interactive" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="avatar avatar--md avatar--mineral" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>
                      {ao.bailleur?.sigle?.slice(0, 3) ?? "—"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-meta" style={{ marginBottom: 2 }}>{ao.reference}</div>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ao.titre}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-shale)", marginTop: 4 }}>
                        {ao.bailleur?.sigle} · <span className="tabular-nums">{ao._count?.soumissions ?? 0}</span> soumission{(ao._count?.soumissions ?? 0) > 1 ? "s" : ""}
                        {isUrgent && <> · <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>J-{days}</span></>}
                      </div>
                    </div>
                    <span className={`badge ${STATUT_BADGE[ao.statut] ?? "badge--draft"}`}>
                      <span className="dot"></span>
                      {STATUT_LABEL[ao.statut] ?? ao.statut}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--color-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="eyebrow" style={{ color: "var(--color-ink)" }}>Notifications</span>
              {notifications.length > 0 && (
                <span className="badge badge--review" style={{ fontFamily: "var(--font-mono)" }}>
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <i className="ph ph-bell-slash" aria-hidden="true" style={{ fontSize: 24, color: "var(--color-mineral)", display: "inline-block", marginBottom: 8 }}></i>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-stone)" }}>Aucune notification.</div>
              </div>
            ) : (
              <div>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-line)" }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-ink)" }}>{n.titre}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-shale)", marginTop: 2, lineHeight: "var(--leading-normal)" }}>{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 16, background: "var(--color-canvas)" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Raccourci</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", lineHeight: "var(--leading-snug)", marginBottom: 12 }}>
              Recherche universelle <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>⌘K</em>
            </div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-shale)", margin: 0, lineHeight: "var(--leading-normal)" }}>
              Trouver un AO, un fournisseur ou exécuter une action depuis n&apos;importe quelle page.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
