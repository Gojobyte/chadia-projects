import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TenderAPI, NotifAPI } from "@/lib/api";

function daysUntil(date: Date): number { return Math.ceil((date.getTime() - Date.now()) / 864e5); }
function fmtMoney(n: number, cur = "FCFA"): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const aoStatutColors: Record<string, string> = {
  BROUILLON: "var(--text-3)", PUBLIE: "var(--info)", EN_COURS: "var(--primary)",
  CLOTURE: "var(--warning)", EN_EVALUATION: "var(--secondary)", ATTRIBUE: "var(--success)",
  ANNULE: "var(--danger)", ARCHIVE: "var(--text-3)",
};

const bailleurColors: Record<string, string> = {
  PNUD: "oklch(0.55 0.18 245)", UE: "oklch(0.55 0.18 270)",
  BADEA: "oklch(0.55 0.15 30)", AFD: "oklch(0.55 0.15 0)",
  USAID: "oklch(0.55 0.15 240)", BM: "oklch(0.5 0.15 200)",
};

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch data from microservices
  let kpis = { totalAO: 0, actifs: 0, attribues: 0, tauxAttribution: 0, totalSoumissions: 0, totalFournisseurs: 0, budgetTotal: 0, budgetAttribue: 0 };
  let appelsOffres: Record<string, unknown>[] = [];
  let notifications: Record<string, unknown>[] = [];

  try {
    const [analytics, aoList, notifs] = await Promise.allSettled([
      TenderAPI.getAnalytics(session.user.id),
      TenderAPI.listAppelsOffres({ statut: "PUBLIE,EN_COURS", limit: "8" }, session.user.id),
      NotifAPI.listNotifications(session.user.id, session.user.id),
    ]);

    if (analytics.status === "fulfilled") kpis = analytics.value?.kpis || kpis;
    if (aoList.status === "fulfilled") appelsOffres = aoList.value?.appelsOffres || [];
    if (notifs.status === "fulfilled") notifications = notifs.value?.notifications || [];
  } catch (e) {
    console.error("Dashboard fetch error:", e);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Bonjour {session.user.name?.split(" ")[0]} 👋</div>
          <div className="page-subtitle">{kpis.actifs} appels d&apos;offres actifs · {kpis.totalSoumissions} soumissions · {kpis.tauxAttribution}% taux d&apos;attribution</div>
        </div>
        <div className="page-actions">
          <Link href="/appels-offres" className="btn btn-secondary">Appels d&apos;offres</Link>
          <Link href="/appels-offres/nouveau" className="btn btn-primary">+ Nouvel appel d&apos;offre</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Appels d'offres actifs", value: String(kpis.actifs), trend: `${kpis.totalAO} total`, color: "var(--primary)" },
          { label: "Soumissions", value: String(kpis.totalSoumissions), trend: `${kpis.totalFournisseurs} fournisseurs`, color: "var(--info)" },
          { label: "Attribués", value: String(kpis.attribues), trend: `${kpis.tauxAttribution}% taux`, color: "var(--success)" },
          { label: "Budget", value: fmtMoney(kpis.budgetTotal), trend: fmtMoney(kpis.budgetAttribue) + " attribué", color: "var(--warning)" },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: "16px 18px" }}>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: k.color }} />
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{k.label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 6, color: "var(--text)" }}>{k.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{k.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Appels d&apos;offres récents</div>
            <Link href="/appels-offres" style={{ fontSize: 12, color: "var(--primary)" }}>Voir tout →</Link>
          </div>
          {appelsOffres.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-3)", padding: 32, fontSize: 13 }}>
              Aucun appel d&apos;offre. <Link href="/appels-offres/nouveau" style={{ color: "var(--primary)" }}>Créer</Link>
            </div>
          ) : (
            <div>
              {appelsOffres.map((ao: Record<string, unknown>) => {
                const days = daysUntil(new Date(ao.dateLimiteDepot as string));
                const isUrgent = days <= 7 && days >= 0;
                return (
                  <Link key={ao.id as string} href={`/appels-offres/${ao.id}`} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: bailleurColors[ao.bailleur as string] || "oklch(0.55 0.13 200)",
                      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 10,
                    }}>
                      {(ao.bailleur as Record<string, string>)?.sigle}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ao.titre as string}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{ao.reference as string} · {(ao._count as Record<string, number>)?.soumissions || 0} soumissions</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: aoStatutColors[ao.statut as string], padding: "2px 8px", borderRadius: 4, background: `${aoStatutColors[ao.statut as string]}15` }}>
                      {ao.statut as string}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>Notifications</div>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-3)", padding: 16, fontSize: 12 }}>Aucune notification</div>
            ) : (
              <div>
                {notifications.slice(0, 5).map((n: Record<string, unknown>) => (
                  <div key={n.id as string} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{n.titre as string}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{n.message as string}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
