import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TenderAPI } from "@/lib/api";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch all projects from tender service for analytics
  let projets: Array<{ budget: number | null; devise: string; statut: string; bailleur: { sigle: string } | null }> = [];
  let bailleurs: Array<{ id: string; sigle: string; _count: { projets: number } }> = [];

  try {
    const [aoData, fournisseursData] = await Promise.allSettled([
      TenderAPI.listAppelsOffres({ limit: "1000" }, session.user.id),
      TenderAPI.listFournisseurs({}, session.user.id),
    ]);

    if (aoData.status === "fulfilled") {
      const aos = aoData.value?.appelsOffres || [];
      projets = aos.map((ao: Record<string, unknown>) => ({
        budget: (ao.budget as number) || null,
        devise: (ao.devise as string) || "XAF",
        statut: (ao.statut as string) || "BROUILLON",
        bailleur: { sigle: (ao.bailleur as string) || "N/A" },
      }));
    }
  } catch (e) {
    console.error("Analytics fetch error:", e);
  }

  const totalProjets = projets.length;
  const soumis = projets.filter(p => p.statut === "PUBLIE" || p.statut === "EN_COURS").length;
  const acceptes = projets.filter(p => p.statut === "ATTRIBUE").length;
  const rejetes = projets.filter(p => p.statut === "ANNULE").length;
  const totalSoumissions = soumis + acceptes + rejetes;
  const tauxAcceptation = totalSoumissions > 0 ? Math.round((acceptes / totalSoumissions) * 100) : 0;
  const montantGagne = projets.filter(p => p.statut === "ATTRIBUE").reduce((s, p) => s + (p.budget ?? 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Pilotage strategique</div>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { l: "Taux d'acceptation", v: `${tauxAcceptation}%`, t: `${acceptes} sur ${totalSoumissions} soumis`, up: tauxAcceptation >= 50 },
          { l: "Projets gagnes", v: String(acceptes), t: `sur ${totalProjets} au total`, up: true },
          { l: "Montant remporte", v: montantGagne >= 1e6 ? `${(montantGagne/1e6).toFixed(1)}M` : `${(montantGagne/1e3).toFixed(0)}K`, t: "FCFA", up: true },
          { l: "Projets actifs", v: String(totalProjets - acceptes - rejetes), t: "en cours de montage", up: true },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>{k.l}</div>
            <div className="tnum" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 4 }}>{k.v}</div>
            <div className="row" style={{ gap: 4, fontSize: 11.5, color: k.up ? "var(--success)" : "var(--danger)", marginTop: 2 }}>
              {k.up ? "↑" : "↓"} {k.t}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
        {/* Repartition par statut */}
        <div className="card">
          <div className="card-header"><div className="card-title">Repartition par statut</div></div>
          <div style={{ padding: 18 }}>
            {[
              { label: "Brouillon", count: projets.filter(p => p.statut === "BROUILLON").length, color: "var(--st-brouillon)" },
              { label: "En cours", count: projets.filter(p => p.statut === "EN_COURS").length, color: "var(--st-redaction)" },
              { label: "Publie", count: projets.filter(p => p.statut === "PUBLIE").length, color: "var(--st-soumis)" },
              { label: "Attribue", count: acceptes, color: "var(--st-accepte)" },
              { label: "Annule", count: rejetes, color: "var(--st-rejete)" },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="row" style={{ marginBottom: 4 }}>
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                  </span>
                  <span className="tnum" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600 }}>{s.count}</span>
                </div>
                <div className="progress-bar"><span style={{ width: `${totalProjets > 0 ? (s.count / totalProjets) * 100 : 0}%`, background: s.color }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance par bailleur */}
        <div className="card">
          <div className="card-header"><div className="card-title">Projets par bailleur</div></div>
          <div style={{ padding: "12px 18px 18px" }}>
            {bailleurs.map((b, i) => (
              <div key={b.id} style={{ padding: "8px 0", borderBottom: i < bailleurs.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="row" style={{ marginBottom: 5 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "var(--primary)" }}>
                    {b.sigle.slice(0, 3)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginLeft: 4 }}>{b.sigle}</div>
                  <span className="tnum" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>{b._count.projets}</span>
                </div>
                <div className="progress-bar"><span style={{ width: `${totalProjets > 0 ? (b._count.projets / totalProjets) * 100 : 0}%` }} /></div>
              </div>
            ))}
            {bailleurs.length === 0 && <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, padding: 16 }}>Aucun bailleur</div>}
          </div>
        </div>
      </div>
    </>
  );
}
