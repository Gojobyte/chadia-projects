export const metadata = {
  title: "Résultats · CHADIA",
  description:
    "Impact mesuré : bénéficiaires, infrastructures, économies. Évaluation externe KPMG. Cycle 2024–2025.",
};

const IMPACT = [
  {
    l: "Bénéficiaires directs",
    v: "412",
    em: "k",
    d: "**+18% vs 2024.** Inclut nutrition, santé, eau, éducation. 54% de femmes et filles.",
  },
  {
    l: "Centres de santé équipés",
    v: "38",
    em: "",
    d: "**Couverture régionale 6 provinces.** Dont 12 maternités et 8 centres nutritionnels ambulatoires.",
  },
  {
    l: "Forages réhabilités",
    v: "87",
    em: "",
    d: "**+260 000 personnes** ont retrouvé un accès à l'eau potable certifié OMS dans le bassin du Lac.",
  },
  {
    l: "Économie / estimation",
    v: "−9,4",
    em: "%",
    d: "**187 M FCFA réinjectés** dans des marchés complémentaires grâce à la mise en concurrence.",
  },
];

const SECTORS = [
  { tone: "s1", icon: "ph-heartbeat", nm: "Santé d'urgence ", em: "· nutrition", sub: "38 centres équipés · 12 mat.", ben: "142", benUnit: "k bénéf.", pct: "34" },
  { tone: "s2", icon: "ph-drop", nm: "Eau & ", em: "assainissement", sub: "87 forages · 14 réseaux", ben: "96", benUnit: "k bénéf.", pct: "23" },
  { tone: "s3", icon: "ph-bowl-food", nm: "Sécurité ", em: "alimentaire", sub: "3 200 ménages assistés", ben: "82", benUnit: "k bénéf.", pct: "20" },
  { tone: "s4", icon: "ph-graduation-cap", nm: "Éducation ", em: "de base", sub: "22 écoles · 4 internats filles", ben: "54", benUnit: "k bénéf.", pct: "13" },
  { tone: "s5", icon: "ph-plant", nm: "Agroécologie", em: "", sub: "6 800 ha · 19 coopératives", ben: "28", benUnit: "k bénéf.", pct: "7" },
  { tone: "s6", icon: "ph-lifebuoy", nm: "Réfugiés ", em: "& déplacés", sub: "Soudan · RCA · Lac", ben: "10", benUnit: "k bénéf.", pct: "3" },
];

const FUNDING = [
  { color: "oklch(0.45 0.15 240)", nm: "Union Européenne · ECHO", v: "38%", dash: "38 62", offset: "25" },
  { color: "oklch(0.45 0.15 165)", nm: "Banque Mondiale", v: "22%", dash: "22 78", offset: "-13" },
  { color: "oklch(0.55 0.15 65)", nm: "AFD · France", v: "18%", dash: "18 82", offset: "-35" },
  { color: "oklch(0.45 0.15 220)", nm: "Nations Unies", v: "14%", dash: "14 86", offset: "-53" },
  { color: "oklch(0.55 0.16 25)", nm: "USAID + autres", v: "8%", dash: "8 92", offset: "-67" },
];

const OECD = [
  { crit: "Pertinence", v: "4,6", em: "/5", nt: "Programmes alignés avec les besoins formulés par les comités villageois." },
  { crit: "Efficacité", v: "82", em: "%", nt: "Objectifs opérationnels atteints sur 35 programmes audités en 2025." },
  { crit: "Efficience", v: "−9", em: "%", nt: "Coût moyen vs estimation initiale grâce à la mise en concurrence." },
  { crit: "Impact", v: "412", em: "k", nt: "Bénéficiaires directs en 2025, mesurés par la méthode KPMG." },
  { crit: "Durabilité", v: "78", em: "%", nt: "Infrastructures encore en service 24 mois après livraison." },
];

function renderDesc(d: string) {
  const parts = d.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function ResultatsImpactPage() {
  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Résultats · ce que nous avons changé
          </div>
          <h1>Mesurer, <em>publier,</em> assumer.</h1>
          <p className="lede">
            Nos programmes ne valent que par leurs effets concrets.{" "}
            <strong>Toutes les données ci-dessous sont auditées</strong> par le cabinet KPMG
            Afrique Centrale et croisées avec les rapports terrain de nos comités villageois.
            Cycle d&apos;évaluation 2024–2025.
          </p>
          <div className="phero-meta">
            <span>Période <strong>janvier 2024 – décembre 2025</strong></span>
            <span><strong>2,3 M</strong> bénéficiaires cumulés</span>
            <span><strong>241</strong> marchés exécutés</span>
            <span>Évaluation externe <strong>KPMG · Mars 2026</strong></span>
          </div>
        </div>
      </section>

      <section className="impact">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Vue d&apos;ensemble · 2025
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "24ch" }}>
            Quatre chiffres pour <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>une année.</em>
          </h2>
          <div className="impact-grid">
            {IMPACT.map((i) => (
              <div key={i.l} className="imp">
                <div className="l">{i.l}</div>
                <div className="v">{i.v}{i.em && <em>{i.em}</em>}</div>
                <div className="d">{renderDesc(i.d)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sectors">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Répartition par secteur
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "22ch" }}>
            Six terrains <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>d&apos;action.</em>
          </h2>
          <div className="sectors-grid">
            <div>
              {SECTORS.map((s) => (
                <div key={s.nm} className="sec-row">
                  <div className={`ic ${s.tone}`}><i className={`ph ${s.icon}`}></i></div>
                  <div className="body">
                    <div className="nm">
                      {s.nm}{s.em && <em>{s.em}</em>}
                      <small>{s.sub}</small>
                    </div>
                    <div className="ben">{s.ben} <em>{s.benUnit}</em></div>
                    <div className="pct">{s.pct}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="donut-card">
              <div className="section-eyebrow" style={{ marginBottom: 0 }}>
                <span className="rule"></span> Source de financement
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, margin: "8px 0 4px", lineHeight: 1, letterSpacing: "-0.01em" }}>
                5,4 <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>Mds FCFA</em>
              </h3>
              <p style={{ fontSize: 12, color: "var(--color-shale)", margin: "0 0 8px", fontFamily: "var(--font-mono)" }}>
                Total budget exécuté · 2025
              </p>
              <div className="donut-wrap">
                <svg className="donut" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91" fill="none" stroke="var(--color-canvas)" strokeWidth="6"></circle>
                  {FUNDING.map((f) => (
                    <circle
                      key={f.nm}
                      cx="21" cy="21" r="15.91"
                      fill="none"
                      stroke={f.color}
                      strokeWidth="6"
                      strokeDasharray={f.dash}
                      strokeDashoffset={f.offset}
                      transform="rotate(-90 21 21)"
                    />
                  ))}
                  <text x="21" y="21" textAnchor="middle" dominantBaseline="central" fontFamily="Instrument Serif" fontSize="6" fill="var(--color-ink)">100%</text>
                </svg>
              </div>
              <div className="donut-legend">
                {FUNDING.map((f) => (
                  <div key={f.nm} className="row">
                    <span className="sw" style={{ background: f.color }}></span>
                    <span>{f.nm}</span>
                    <span className="v">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="oecd">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Évaluation OCDE / CAD
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Cinq critères, <em>une note.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15, color: "rgba(250,247,241,0.78)" }}>
            Méthodologie standardisée du Comité d&apos;Aide au Développement de l&apos;OCDE, appliquée
            par KPMG Afrique Centrale sur l&apos;ensemble du portefeuille 2024–2025.
          </p>
          <div className="oecd-grid">
            {OECD.map((o) => (
              <div key={o.crit} className="oecd-cell">
                <div className="crit">{o.crit}</div>
                <div className="v">{o.v}<em>{o.em}</em></div>
                <div className="nt">{o.nt}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
