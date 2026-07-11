export const metadata = {
  title: "Rapports financiers · ONG CHADIA",
  description:
    "États financiers SYSCOHADA déposés. Exercices 2021, 2022, 2023, 2024 · cabinet Atrio Consultance.",
};

const RAPPORTS = [
  {
    yr: "2024",
    em: "bilan + DSF",
    nm: "États financiers normalisés",
    desc:
      "Bilan + Compte de résultat + Tableau des flux de trésorerie. CA services 205,5 M FCFA, résultat net 15,6 M FCFA, total bilan 64,2 M FCFA. Régime fiscal Réel.",
    audit: true,
    pdf: "Bilan + DSF",
    pages: "33 fiches",
    cabinet: "Atrio Consultance",
    href: "/docs/finance/bilan-2024.pdf",
  },
  {
    yr: "2023",
    em: "audité",
    nm: "États financiers annuels",
    desc:
      "Subvention d'exploitation 578,7 M FCFA, charges de personnel 57,7 M FCFA, résultat net 1,8 M FCFA. Premier exercice à recettes externes consolidées.",
    audit: true,
    pdf: "PDF",
    pages: "complet",
    cabinet: "Atrio Consultance",
    href: "/docs/finance/etats-financiers-2023.pdf",
  },
  {
    yr: "2022",
    em: "audité",
    nm: "États financiers annuels",
    desc:
      "Exercice de structuration. Mise en place du Bureau Exécutif acté le 15 octobre. Premières missions documentées AUDA-NEPAD (Tchad, Rwanda, Côte d'Ivoire).",
    audit: true,
    pdf: "PDF",
    pages: "complet",
    cabinet: "Atrio Consultance",
    href: "/docs/finance/etats-financiers-2022.pdf",
  },
  {
    yr: "2021",
    em: "audité",
    nm: "États financiers annuels",
    desc:
      "Exercice de référence pour la consolidation comptable au format SYSCOHADA. Base des comparaisons d'évolution N/N-1 des exercices suivants.",
    audit: true,
    pdf: "PDF",
    pages: "complet",
    cabinet: "Atrio Consultance",
    href: "/docs/finance/etats-financiers-2021.pdf",
  },
];

// DSF (Déclarations Statistiques et Fiscales) — documents fiscaux séparés
// des bilans. Utiles pour les contrôles de l'administration fiscale.
const DSF = [
  { yr: "DSF 2024", href: "/docs/finance/dsf-2024.pdf", desc: "Déclaration Statistique et Fiscale · exercice 2024" },
  { yr: "DSF 2025", href: "/docs/finance/dsf-2025.pdf", desc: "Déclaration Statistique et Fiscale · exercice 2025 (en cours)" },
];

const KPI = [
  { l: "CA services 2024", v: "205", em: "M FCFA", d: "Croissance vs 2023 (subventions reclassées)" },
  { l: "Résultat net 2024", v: "15,6", em: "M FCFA", d: "+776% vs 2023 (résultat net 1,8 M FCFA)" },
  { l: "Bilan total 2024", v: "64,2", em: "M FCFA", d: "Légère contraction · trésorerie consolidée" },
  { l: "Charges personnel", v: "42,2", em: "M FCFA", d: "8 salariés (5 employés + 3 cadres)" },
];

export default function RapportsPage() {
  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Rapports financiers · accès libre
          </div>
          <h1>Quatre exercices <em>déposés</em>.</h1>
          <p className="lede">
            Nos états financiers sont préparés au <strong>format normalisé SYSCOHADA</strong> et déposés chaque année auprès de la Direction Générale des Impôts (Centre de N&apos;Djamena). Le cabinet <strong>Atrio Consultance</strong>, inscrit à l&apos;Ordre National des Experts-Comptables, vise nos comptes et atteste leur conformité.
          </p>
          <div className="phero-meta">
            <span><strong>4</strong> exercices disponibles · 2021–2024</span>
            <span>Format <strong>SYSCOHADA</strong> (OHADA)</span>
            <span>Visa <strong>Atrio Consultance</strong> · BP 6118 N&apos;Djamena</span>
            <span>Régime fiscal <strong>Réel</strong></span>
          </div>
        </div>
      </section>

      <section className="impact">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Exercice 2024 · vue d&apos;ensemble
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "24ch" }}>
            Quatre indicateurs <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>clés.</em>
          </h2>
          <div className="impact-grid">
            {KPI.map((i) => (
              <div key={i.l} className="imp">
                <div className="l">{i.l}</div>
                <div className="v">{i.v}<em>{i.em}</em></div>
                <div className="d">{i.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Bibliothèque d&apos;archives
          </div>
          <h2>Tous les <em>exercices.</em></h2>
          <p className="lede">
            Téléchargement direct ci-dessous. Les états bruts sont conservés au siège (Quartier Kabalaye, N&apos;Djamena) et le dépôt légal est effectué auprès du Ministère de l&apos;Économie et de la Planification du Développement.
          </p>
          <div className="rapports-grid">
            {RAPPORTS.map((r) => (
              <a
                key={r.yr}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rapport-card"
              >
                <div className="yr">
                  {r.yr}
                  {r.em && <em> · {r.em}</em>}
                </div>
                <div className="nm">{r.nm}</div>
                <div className="desc">{r.desc}</div>
                <div className="meta">
                  <span><i className="ph ph-file-pdf"></i> {r.pdf}</span>
                  <span>{r.pages}</span>
                  {r.audit ? (
                    <span className="audit">visé {r.cabinet}</span>
                  ) : (
                    <span>{r.cabinet}</span>
                  )}
                </div>
              </a>
            ))}
          </div>

          {/* Bloc DSF — documents fiscaux séparés du bilan */}
          <div style={{ marginTop: 32, padding: 20, background: "var(--color-canvas)", border: "1px solid var(--color-line)", borderRadius: 6 }}>
            <div style={{ fontSize: 11, letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--color-shale)", fontWeight: 600, marginBottom: 8 }}>
              Déclarations fiscales (DSF) complémentaires
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {DSF.map((d) => (
                <a
                  key={d.yr}
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 4, fontSize: 13, color: "var(--color-ink)", textDecoration: "none" }}
                  title={d.desc}
                >
                  <i className="ph ph-file-pdf" style={{ color: "var(--color-terracotta)" }}></i>
                  {d.yr}
                  <i className="ph ph-arrow-up-right" style={{ fontSize: 12, color: "var(--color-stone)" }}></i>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Détail de l&apos;exercice 2024
          </div>
          <h2>Ce que nos <em>chiffres racontent.</em></h2>
          <p className="lede">
            L&apos;exercice 2024 est le premier à présenter un chiffre d&apos;affaires consolidé sur les services (formation, conseil, ingénierie entrepreneuriale) — résultat des contrats SPE et autres missions sectorielles.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 32 }}>
            <div style={{ padding: 24, background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 6 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, margin: "0 0 12px" }}>Produits 2024</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 16px", margin: 0, fontSize: 14 }}>
                <dt style={{ color: "var(--color-sepia)" }}>Services vendus (HT)</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>205 454 854</dd>
                <dt style={{ color: "var(--color-sepia)" }}>Valeur ajoutée</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>60 349 724</dd>
                <dt style={{ color: "var(--color-sepia)" }}>Excédent brut d&apos;exploitation</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>18 195 179</dd>
                <dt style={{ color: "var(--color-sepia)", fontWeight: 600 }}>Résultat net</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)", color: "var(--color-success)", fontWeight: 600 }}>15 614 370</dd>
              </dl>
            </div>
            <div style={{ padding: 24, background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 6 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, margin: "0 0 12px" }}>Charges 2024</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 16px", margin: 0, fontSize: 14 }}>
                <dt style={{ color: "var(--color-sepia)" }}>Charges de personnel</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>42 154 545</dd>
                <dt style={{ color: "var(--color-sepia)" }}>Sous-traitance générale</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>22 451 454</dd>
                <dt style={{ color: "var(--color-sepia)" }}>Formation du personnel</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>10 945 329</dd>
                <dt style={{ color: "var(--color-sepia)" }}>Entretien & maintenance</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>6 558 545</dd>
                <dt style={{ color: "var(--color-sepia)" }}>Impôt sur le résultat</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>5 465 030</dd>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
