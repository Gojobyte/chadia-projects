import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TenderAPI } from "@/lib/api";

interface AnalyticsData {
  kpis: {
    totalAO: number;
    actifs: number;
    attribues: number;
    tauxAttribution: number;
    totalSoumissions: number;
    totalFournisseurs: number;
    verifies: number;
    budgetTotal: number;
    budgetAttribue: number;
  };
  byCategorie: { categorie: string; _count: { id: number } }[];
  byStatut: { statut: string; _count: { id: number } }[];
  topBailleurs: { bailleurId: string; _count: { id: number }; bailleur?: { nom: string; sigle: string } }[];
}

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

function fmtMoney(n: number, cur = "FCFA"): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${cur}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k ${cur}`;
  return `${new Intl.NumberFormat("fr-FR").format(n)} ${cur}`;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  let data: AnalyticsData | null = null;
  let errorMsg: string | null = null;
  try {
    data = await TenderAPI.getAnalytics(token);
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const k = data?.kpis ?? { totalAO: 0, actifs: 0, attribues: 0, tauxAttribution: 0, totalSoumissions: 0, totalFournisseurs: 0, verifies: 0, budgetTotal: 0, budgetAttribue: 0 };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pilotage</div>
          <h1 className="page-title">Anal<em>ytique</em></h1>
          <p className="page-subtitle">Vue consolidée de l&apos;activité — appels d&apos;offres, soumissions, attributions et budgets.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="lbl">Taux d&apos;attribution</div>
          <div className="val tabular-nums">
            {k.tauxAttribution}<span className="unit">%</span>
          </div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            <span className="tabular-nums">{k.attribues}</span> sur <span className="tabular-nums">{k.totalAO}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Soumissions reçues</div>
          <div className="val tabular-nums">{k.totalSoumissions}</div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            <span className="tabular-nums">{k.totalFournisseurs}</span> fournisseurs · <span className="tabular-nums">{k.verifies}</span> vérifiés
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Budget engagé</div>
          <div className="val">
            {k.budgetTotal > 0
              ? <>{new Intl.NumberFormat("fr-FR").format(Math.round(k.budgetTotal / 1_000_000))}<span className="unit"> M</span></>
              : <>0<span className="unit"> FCFA</span></>}
          </div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>
            {fmtMoney(k.budgetAttribue)} attribué
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Appels actifs</div>
          <div className="val tabular-nums">{k.actifs}</div>
          <div className="delta" style={{ color: "var(--color-stone)" }}>en cours de soumission</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h2 className="section-title">Répartition par statut</h2>
            <span className="card-meta">{data?.byStatut.length ?? 0} statuts</span>
          </div>
          <div className="card" style={{ padding: 24 }}>
            {(data?.byStatut ?? []).length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--color-stone)", padding: 16, fontSize: "var(--text-xs)" }}>Pas de données.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {(data?.byStatut ?? []).map((s) => {
                  const total = (data?.byStatut ?? []).reduce((acc, x) => acc + x._count.id, 0);
                  const pct = total > 0 ? (s._count.id / total) * 100 : 0;
                  return (
                    <div key={s.statut}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span className={`badge ${STATUT_BADGE[s.statut] ?? "badge--draft"}`}>
                          <span className="dot"></span>
                          {STATUT_LABEL[s.statut] ?? s.statut}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-ink)" }}>
                          <span className="tabular-nums">{s._count.id}</span>
                          <span style={{ color: "var(--color-stone)", marginLeft: 8, fontSize: "var(--text-xs)" }}>{pct.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div style={{ height: 4, background: "var(--color-canvas)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-terracotta)", transition: "width 240ms var(--ease-out)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h2 className="section-title">Top bailleurs</h2>
            <span className="card-meta">{data?.topBailleurs.length ?? 0} actifs</span>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {(data?.topBailleurs ?? []).length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--color-stone)", padding: 32, fontSize: "var(--text-xs)" }}>Pas encore d&apos;appels d&apos;offres.</div>
            ) : (
              (data?.topBailleurs ?? []).map((b, i) => (
                <div key={b.bailleurId} style={{ padding: "16px 20px", borderBottom: i < (data?.topBailleurs.length ?? 0) - 1 ? "1px solid var(--color-line)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar avatar--sm avatar--mineral" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                    {(b.bailleur?.sigle ?? "—").slice(0, 3)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-ink)" }}>{b.bailleur?.sigle ?? "—"}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-shale)" }}>{b.bailleur?.nom}</div>
                  </div>
                  <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--color-ink)" }}>{b._count.id}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
