import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const YEARS = [
  { y: "2018", total: "28M", segs: [{ tone: "pnud", h: 14 }, { tone: "cf", h: 8 }, { tone: "fonds", h: 6 }] },
  { y: "2019", total: "42M", segs: [{ tone: "pnud", h: 22 }, { tone: "ue", h: 12 }, { tone: "cf", h: 10 }, { tone: "fonds", h: 6 }] },
  { y: "2020", total: "38M", segs: [{ tone: "pnud", h: 18 }, { tone: "ue", h: 14 }, { tone: "cf", h: 8 }] },
  { y: "2021", total: "68M", segs: [{ tone: "pnud", h: 32 }, { tone: "ue", h: 18 }, { tone: "cf", h: 14 }, { tone: "fonds", h: 8 }] },
  { y: "2022", total: "72M", segs: [{ tone: "pnud", h: 28 }, { tone: "ue", h: 24 }, { tone: "cf", h: 18 }, { tone: "fonds", h: 8 }] },
  { y: "2023", total: "88M", segs: [{ tone: "pnud", h: 38 }, { tone: "ue", h: 28 }, { tone: "cf", h: 18 }, { tone: "fonds", h: 10 }] },
  { y: "2024", total: "102M", segs: [{ tone: "pnud", h: 42 }, { tone: "ue", h: 38 }, { tone: "cf", h: 24 }, { tone: "fonds", h: 14 }] },
  { y: "2025", total: "130M", segs: [{ tone: "pnud", h: 54 }, { tone: "ue", h: 48 }, { tone: "cf", h: 32 }, { tone: "fonds", h: 14 }] },
  { y: "2026", total: "94M", ytd: true, segs: [{ tone: "pnud", h: 38 }, { tone: "ue", h: 34 }, { tone: "cf", h: 22 }] },
];

const FUNDING_2026 = [
  { color: "oklch(0.55 0.13 220)", nm: "PNUD", v: "38", dash: "34 88", offset: "0" },
  { color: "oklch(0.5 0.16 240)", nm: "Union Européenne", v: "33", dash: "29 88", offset: "-34" },
  { color: "oklch(0.55 0.16 25)", nm: "Coop. Française", v: "21", dash: "18 88", offset: "-63" },
  { color: "var(--color-mineral)", nm: "Fonds propres", v: "8", dash: "7 88", offset: "-81" },
];

const SECTORS = [
  { lbl: "Jeunesse · formation", w: 88, v: "3 480" },
  { lbl: "Femmes · AVEC", w: 72, v: "2 850" },
  { lbl: "Eau & assainissement", w: 64, v: "2 510" },
  { lbl: "Éducation", w: 48, v: "1 890" },
  { lbl: "Santé primaire", w: 32, v: "1 240" },
  { lbl: "Cohésion · paix", w: 18, v: "680" },
];

const SPARKS = [
  { nm: "Forages réhabilités", sub: "cumul depuis 2018", points: "0,24 12,22 24,18 36,15 48,11 60,8 72,6 80,5", v: "19", color: "var(--color-success)" },
  { nm: "Femmes en AVEC", sub: "actives 2026", points: "0,22 12,20 24,16 36,14 48,11 60,9 72,7 80,5", v: "312", color: "var(--color-success)" },
  { nm: "Jeunes formés", sub: "cycle 9 mois", points: "0,18 12,16 24,14 36,15 48,12 60,10 72,8 80,7", v: "240", color: "var(--color-success)" },
  { nm: "Survivantes VBG suivies", sub: "2025-26", points: "0,22 12,20 24,16 36,14 48,12 60,10 72,8 80,6", v: "94", color: "var(--color-terracotta)" },
  { nm: "Latrines construites", sub: "WASH Mongo", points: "0,24 12,21 24,17 36,14 48,11 60,9 72,7 80,5", v: "24", color: "var(--color-success)" },
];

const PERIODS = ["3 mois", "12 mois", "3 ans", "Depuis 2018"];

export default async function AnalysesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Pilotage 2018 → 2026 · 8 ans d&apos;activité</div>
          <h1 className="pg-title">L&apos;activité <em>en chiffres.</em></h1>
          <p className="pg-sub">
            Tableau de bord agrégé sur l&apos;ensemble des projets de CHADIA — montants engagés,
            bénéficiaires touchés, répartition par bailleur et par zone d&apos;intervention.
            Les chiffres sont rapprochés mensuellement avec la comptabilité.
          </p>
        </div>
        <div className="pg-actions">
          <div className="an-period">
            {PERIODS.map((p) => (
              <button key={p} className={p === "12 mois" ? "on" : ""}>{p}</button>
            ))}
          </div>
          <button className="btn btn--secondary btn--sm"><i className="ph ph-export"></i> Exporter (PDF)</button>
        </div>
      </header>

      <div className="kpi-row">
        <div className="kpi">
          <div className="l">Volume cumulé géré</div>
          <div className="v">568 <em>M FCFA</em></div>
          <div className="delta">depuis 2018 · <strong className="up">+187 M sur 12 mois</strong></div>
        </div>
        <div className="kpi">
          <div className="l">Bénéficiaires directs</div>
          <div className="v">12 <em>k+</em></div>
          <div className="delta">cumul · <strong className="up">+1 240 ce trimestre</strong></div>
        </div>
        <div className="kpi">
          <div className="l">Projets clôturés</div>
          <div className="v">11<em>/15</em></div>
          <div className="delta">taux d&apos;achèvement · <strong className="up">73%</strong></div>
        </div>
        <div className="kpi">
          <div className="l">Taux de décaissement</div>
          <div className="v">87<em>%</em></div>
          <div className="delta">budget engagé / consommé · <strong className="flat">stable</strong></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Volume <em>par exercice</em> et par bailleur</h3>
          <p className="sub">Engagements financiers cumulés depuis 2018, en millions de FCFA, ventilés par partenaire financier</p>
          <div className="barchart">
            {YEARS.map((y) => (
              <div key={y.y} className="yr">
                {y.segs.map((s, i) => (
                  <div key={i} className={`seg ${s.tone}`} style={{ height: s.h }}></div>
                ))}
                <div className="lbl">
                  {y.y}<br/>
                  <strong style={{ color: y.ytd ? "var(--color-terracotta)" : "var(--color-ink)", fontFamily: "var(--font-display)", fontWeight: 400 }}>{y.total}</strong>
                  {y.ytd && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-stone)", display: "block" }}>YTD</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="legend">
            <span><i style={{ background: "oklch(0.55 0.13 220)" }}></i> PNUD</span>
            <span><i style={{ background: "oklch(0.5 0.16 240)" }}></i> Union Européenne</span>
            <span><i style={{ background: "oklch(0.55 0.16 25)" }}></i> Coopération Française</span>
            <span><i style={{ background: "var(--color-mineral)" }}></i> Fonds propres &amp; dons</span>
          </div>
          <div className="panel-foot">
            <span>Source · Comptabilité CHADIA · audit 2024 par cabinet ECTAF</span>
            <Link href="/rapports">Détail par projet →</Link>
          </div>
        </div>

        <div className="panel">
          <h3>Mix <em>de financement</em></h3>
          <p className="sub">2026 · 187 M FCFA engagés</p>
          <div className="an-donut-wrap">
            <div className="an-donut">
              <svg viewBox="0 0 36 36" width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-canvas)" strokeWidth="6"/>
                {FUNDING_2026.map((f) => (
                  <circle
                    key={f.nm}
                    cx="18" cy="18" r="14"
                    fill="none"
                    stroke={f.color}
                    strokeWidth="6"
                    strokeDasharray={f.dash}
                    strokeDashoffset={f.offset}
                  />
                ))}
              </svg>
              <div className="ct"><strong>187<em>M</em></strong><small>FCFA · 2026</small></div>
            </div>
            <div className="donut-rows">
              {FUNDING_2026.map((f) => (
                <div key={f.nm} className="row">
                  <span className="sw" style={{ background: f.color }}></span>
                  <span className="nm">{f.nm}</span>
                  <span className="v">{f.v}<em>%</em></span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-foot">
            <span>3 partenaires actifs en 2026</span>
            <Link href="/gouvernance">Voir les partenaires →</Link>
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="panel">
          <h3>Bénéficiaires <em>par zone</em></h3>
          <p className="sub">Répartition cumulée 2018–2026</p>
          <div className="zone-map">
            <svg viewBox="0 0 400 300" preserveAspectRatio="none">
              <path d="M 70 50 Q 200 30 330 70 Q 360 150 340 230 Q 230 280 110 260 Q 50 190 60 120 Z"
                    fill="oklch(0.95 0.025 75)" stroke="var(--color-line-strong)" strokeWidth="1.5"/>
              <ellipse cx="155" cy="120" rx="32" ry="20" fill="oklch(0.92 0.04 220)" stroke="var(--color-info)" strokeWidth="1" opacity="0.5"/>
            </svg>
            <div className="pin lg" style={{ left: "48%", top: "78%" }}>
              <span className="dot"></span>
              <span className="lbl">N&apos;Djaména · 6 240</span>
            </div>
            <div className="pin" style={{ left: "62%", top: "48%" }}>
              <span className="dot"></span>
              <span className="lbl">Mongo · 3 880</span>
            </div>
            <div className="pin" style={{ left: "74%", top: "62%" }}>
              <span className="dot"></span>
              <span className="lbl">Bitkine · 1 720</span>
            </div>
          </div>
          <div className="legend">
            <span><i style={{ background: "var(--color-terracotta)" }}></i> Sites d&apos;intervention permanents</span>
          </div>
        </div>

        <div className="panel">
          <h3>Bénéficiaires <em>par secteur</em></h3>
          <p className="sub">Décompte personnes uniques · cumul</p>
          <div style={{ marginTop: 8 }}>
            {SECTORS.map((s) => (
              <div key={s.lbl} className="row-bar">
                <span className="lbl">{s.lbl}</span>
                <div className="bar"><span style={{ width: `${s.w}%` }}></span></div>
                <span className="v">{s.v}</span>
              </div>
            ))}
          </div>
          <div className="panel-foot">
            <span>56% femmes · 44% hommes</span>
            <Link href="#">Détail →</Link>
          </div>
        </div>

        <div className="panel">
          <h3>Indicateurs <em>SUIVI</em></h3>
          <p className="sub">Top 5 KPI projets actifs · 12 derniers mois</p>
          {SPARKS.map((s) => (
            <div key={s.nm} className="spark-row">
              <div className="nm">{s.nm}<small>{s.sub}</small></div>
              <svg viewBox="0 0 80 28">
                <polyline points={s.points} fill="none" stroke={s.color} strokeWidth="1.5"/>
              </svg>
              <div className="v">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
