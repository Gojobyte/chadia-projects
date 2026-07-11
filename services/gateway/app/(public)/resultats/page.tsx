export const metadata = {
  title: "Résultats · ONG CHADIA",
  description:
    "Impact des programmes ONG CHADIA · AUDA-NEPAD 2022 (145 entrepreneurs), SPE 2024 (15 entrepreneurs, taux maîtrise 88%).",
};

const IMPACT = [
  {
    l: "Entrepreneurs formés",
    v: "160",
    em: "+",
    d: "**145 lors du programme AUDA-NEPAD** (Tchad, Rwanda, Côte d'Ivoire) + 15 lors du programme SPE 2024. Tous secteurs MPME et formation entrepreneuriale.",
  },
  {
    l: "Plans d'affaires élaborés",
    v: "138",
    em: "",
    d: "**95% des participants** AUDA-NEPAD ont élaboré un plan d'affaires personnel. 112 plans (77%) ont été validés en jury final. 23 ont obtenu un financement bancaire ou de microfinance.",
  },
  {
    l: "Taux de maîtrise moyen",
    v: "88",
    em: "%",
    d: "**Programme SPE 2024 · 7 modules**. Évaluation pré/post-test sur l'ensemble des participants. Cible contractuelle de 80% largement dépassée.",
  },
  {
    l: "Pays d'intervention",
    v: "3",
    em: "",
    d: "**Tchad, Rwanda, Côte d'Ivoire**. Missions internationales déployées sous mandat de l'Agence de Développement de l'Union Africaine (AUDA-NEPAD).",
  },
];

const SECTORS = [
  { tone: "s1", icon: "ph-graduation-cap", nm: "Formation ", em: "entrepreneuriale", sub: "Programme phare · 7 modules · andragogie", ben: "160", benUnit: "entrepreneurs", pct: "60" },
  { tone: "s2", icon: "ph-drop", nm: "Eau & ", em: "assainissement (WAS)", sub: "Chantiers BTP · Zone Est et Sud", ben: "Programmes", benUnit: "en cours", pct: "20" },
  { tone: "s3", icon: "ph-bowl-food", nm: "Agriculture ", em: "& élevage", sub: "Transformation agro-alimentaire · MPME", ben: "Programmes", benUnit: "en cours", pct: "10" },
  { tone: "s4", icon: "ph-first-aid", nm: "Santé ", em: "& sécurité", sub: "Renforcement capacités personnel santé", ben: "Attestations", benUnit: "ministérielles", pct: "5" },
  { tone: "s5", icon: "ph-book-open-text", nm: "Éducation", em: "", sub: "Direction technique dédiée à l'organigramme", ben: "Programmes", benUnit: "en cours", pct: "5" },
];

const FUNDING_REELS = [
  { color: "oklch(0.55 0.13 220)", nm: "AUDA-NEPAD / Union Africaine", v: "43", dash: "43 88", offset: "0" },
  { color: "oklch(0.5 0.16 240)", nm: "Solar Power Enterprise (SPE)", v: "23", dash: "23 88", offset: "-43" },
  { color: "oklch(0.55 0.16 25)", nm: "Ministères tchadiens", v: "20", dash: "20 88", offset: "-66" },
  { color: "var(--color-mineral)", nm: "Autres partenaires", v: "14", dash: "14 88", offset: "-86" },
];

const CASES = [
  {
    titre: "AUDA-NEPAD · 145 entrepreneurs MPME",
    em: "Tchad · Rwanda · Côte d'Ivoire",
    period: "Février → Avril 2022",
    desc: "Séminaire en ingénierie entrepreneuriale, gestion d'entreprise et commercialisation des produits agro-pastoraux. 3 sites (N'Djamena, Kigali, Abidjan), 7 modules thématiques, 138 plans d'affaires élaborés.",
    metrics: [
      { l: "Bénéficiaires", v: "145" },
      { l: "Femmes formées", v: "48%" },
      { l: "Plans validés", v: "112" },
      { l: "Financements obtenus", v: "23" },
      { l: "Budget", v: "43,1 M FCFA" },
    ],
    attestation: "Attestation de satisfaction délivrée par M. Amine IDRISS ADOUM KARAMA, Directeur DIICIR de l'AUDA-NEPAD · 14 novembre 2022.",
    pdf: "/docs/rapports-activites/rapport-auda-nepad-2022.pdf",
  },
  {
    titre: "Solar Power Enterprise · Formation Développement Entrepreneurial",
    em: "N'Djamena · Tchad",
    period: "Avril → Juin 2024",
    desc: "Programme de formation pour 15 entrepreneurs partenaires de SPE. 7 modules de 2 jours couvrant l'entrepreneuriat, le business plan, la gestion financière, la stratégie, le marketing, le financement et le leadership.",
    metrics: [
      { l: "Bénéficiaires", v: "15" },
      { l: "Taux de présence", v: "98%" },
      { l: "Taux maîtrise concepts", v: "88%" },
      { l: "Satisfaction globale", v: "92%" },
      { l: "Budget", v: "22,9 M FCFA" },
    ],
    attestation: "Attestation de Bonne Exécution délivrée par M. Terap Haggar, Directeur Général SPE · 10 juillet 2024. Évaluation \"Excellence\" sur 3 dimensions (Expertise Technique, Qualité des Supports, Professionnalisme).",
    pdf: "/docs/rapports-activites/rapport-activite-2024-spe.pdf",
  },
  {
    titre: "Programme national · Renforcement des capacités du personnel de santé",
    em: "Ministère de la Santé publique · Tchad",
    period: "2023 – 2024",
    desc: "Mission de formation et d'accompagnement du personnel de santé tchadien dans le cadre du Programme national de renforcement des capacités. Modules portant sur la santé de la reproduction, la nutrition et la protection contre les VBG.",
    metrics: [
      { l: "Commanditaire", v: "MSP Tchad" },
      { l: "Province ciblée", v: "Ouaddaï" },
      { l: "Axe SR / VBG", v: "5 sous-axes" },
      { l: "Statut", v: "Clôturé" },
    ],
    attestation: "Attestation de satisfaction délivrée par le Ministère de la Santé publique du Tchad.",
    pdf: "/docs/rapports-activites/rapport-renforcement-personnel-sante.pdf",
  },
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
            <span className="rule"></span> Résultats · ce que nous avons fait
          </div>
          <h1>Mesurer, <em>publier,</em> assumer.</h1>
          <p className="lede">
            Nos programmes sont sanctionnés par des <strong>rapports d&apos;activité chiffrés</strong>, des <strong>attestations de bonne exécution</strong> délivrées par chaque commanditaire, et un <strong>suivi post-formation à 3 et 6 mois</strong>. Toutes les données présentées ici sont issues de rapports officiels signés (AUDA-NEPAD, SPE, Ministère de la Santé publique).
          </p>
          <div className="phero-meta">
            <span><strong>160+</strong> entrepreneurs formés</span>
            <span><strong>3</strong> pays d&apos;intervention</span>
            <span>Période <strong>2022 – 2024</strong></span>
            <span>Attestations <strong>signées commanditaires</strong></span>
          </div>
        </div>
      </section>

      <section className="impact">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Vue d&apos;ensemble
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "24ch" }}>
            Quatre chiffres <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>vérifiables.</em>
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
            <span className="rule"></span> Répartition par domaine
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "22ch" }}>
            Cinq domaines <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>d&apos;action.</em>
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
                <span className="rule"></span> Origine des fonds (projets référencés)
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, margin: "8px 0 4px", lineHeight: 1, letterSpacing: "-0.01em" }}>
                Mix <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>partenaires</em>
              </h3>
              <p style={{ fontSize: 12, color: "var(--color-shale)", margin: "0 0 8px", fontFamily: "var(--font-mono)" }}>
                Sur la base des projets référencés (extraits)
              </p>
              <div className="donut-wrap">
                <svg className="donut" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91" fill="none" stroke="var(--color-canvas)" strokeWidth="6"></circle>
                  {FUNDING_REELS.map((f) => (
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
                {FUNDING_REELS.map((f) => (
                  <div key={f.nm} className="row">
                    <span className="sw" style={{ background: f.color }}></span>
                    <span>{f.nm}</span>
                    <span className="v">{f.v}<em>%</em></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Études de cas · projets référencés
          </div>
          <h2>Deux missions, <em>deux attestations.</em></h2>
          <p className="lede">
            Deux programmes phares illustrent notre méthodologie et notre rigueur d&apos;exécution. Chacun a fait l&apos;objet d&apos;un rapport d&apos;activité détaillé et d&apos;une attestation officielle du commanditaire.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 32 }}>
            {CASES.map((c) => (
              <article
                key={c.titre}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 8,
                  padding: 32,
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--color-terracotta)", marginBottom: 8 }}>
                  {c.period}
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.015em", margin: "0 0 12px" }}>
                  {c.titre} <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>· {c.em}</em>
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--color-sepia)", margin: "0 0 24px", maxWidth: "60ch" }}>
                  {c.desc}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${c.metrics.length}, 1fr)`, gap: 0, padding: "16px 0", borderTop: "1px solid var(--color-line)", borderBottom: "1px solid var(--color-line)" }}>
                  {c.metrics.map((m, i, arr) => (
                    <div
                      key={m.l}
                      style={{
                        padding: "0 16px",
                        borderRight: i === arr.length - 1 ? "none" : "1px dashed var(--color-line-strong)",
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-stone)", fontWeight: 600 }}>{m.l}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-shale)", margin: "16px 0 0", fontStyle: "italic" }}>
                  <i className="ph-fill ph-seal-check" style={{ color: "var(--color-success)", marginRight: 4 }}></i>
                  {c.attestation}
                </p>
                {c.pdf && (
                  <div style={{ marginTop: 16 }}>
                    <a
                      href={c.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--color-canvas)", border: "1px solid var(--color-line-strong)", borderRadius: 4, fontSize: 13, color: "var(--color-ink)", textDecoration: "none", fontWeight: 500 }}
                    >
                      <i className="ph ph-file-pdf" style={{ color: "var(--color-terracotta)" }}></i>
                      Voir le rapport d&apos;activité complet
                      <i className="ph ph-arrow-up-right" style={{ fontSize: 12 }}></i>
                    </a>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
