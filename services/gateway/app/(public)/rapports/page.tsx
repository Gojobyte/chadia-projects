export const metadata = {
  title: "Rapports financiers · CHADIA",
  description:
    "Comptes annuels, rapports d'audit externes, états financiers consolidés. Sept exercices en accès libre.",
};

const RAPPORTS = [
  {
    yr: "2025",
    em: "audité",
    nm: "Rapport financier annuel",
    desc:
      "Comptes consolidés, exécution budgétaire par bailleur et secteur, projection 2026. 142 pages.",
    audit: true,
    pdf: "12,8 Mo",
    pages: "142 p.",
    cabinet: "KPMG Afrique Centrale",
  },
  {
    yr: "2024",
    em: "audité",
    nm: "Rapport financier annuel",
    desc:
      "Premier exercice avec déploiement OCDS complet. 38% de fonds européens, 22% Banque Mondiale.",
    audit: true,
    pdf: "11,4 Mo",
    pages: "128 p.",
    cabinet: "KPMG Afrique Centrale",
  },
  {
    yr: "2023",
    em: "audité",
    nm: "Rapport financier annuel",
    desc:
      "Croissance de 14% du portefeuille, ouverture du bureau d'Abéché, premier programme USAID.",
    audit: true,
    pdf: "9,7 Mo",
    pages: "118 p.",
    cabinet: "KPMG Afrique Centrale",
  },
  {
    yr: "2022",
    em: "audité",
    nm: "Rapport financier annuel",
    desc:
      "Année de consolidation post-Covid. Réorganisation logistique et démarrage de l'agroécologie.",
    audit: true,
    pdf: "8,9 Mo",
    pages: "104 p.",
    cabinet: "KPMG Afrique Centrale",
  },
  {
    yr: "2021",
    em: "audité",
    nm: "Rapport financier annuel",
    desc: "Extension régionale Cameroun & RCA. Première convention pluriannuelle UE-ECHO.",
    audit: true,
    pdf: "7,6 Mo",
    pages: "92 p.",
    cabinet: "Mazars Afrique",
  },
  {
    yr: "2020",
    em: "audité",
    nm: "Rapport financier annuel",
    desc: "Adaptation Covid · réponse d'urgence sur 3 200 ménages, redéploiement nutrition.",
    audit: true,
    pdf: "6,8 Mo",
    pages: "84 p.",
    cabinet: "Mazars Afrique",
  },
  {
    yr: "2019",
    em: "audité",
    nm: "Rapport financier annuel",
    desc: "Année de la reconnaissance d'utilité publique. Premier audit externe complet.",
    audit: true,
    pdf: "5,9 Mo",
    pages: "76 p.",
    cabinet: "Mazars Afrique",
  },
  {
    yr: "2018",
    nm: "Bilan & comptes simplifiés",
    desc: "Avant audit externe. États financiers déposés au Greffe selon la loi tchadienne.",
    audit: false,
    pdf: "2,1 Mo",
    pages: "34 p.",
    cabinet: "Auto-publié",
  },
  {
    yr: "2017",
    nm: "Bilan & comptes simplifiés",
    desc: "Période de structuration administrative. Croissance financée majoritairement par ECHO.",
    audit: false,
    pdf: "1,8 Mo",
    pages: "28 p.",
    cabinet: "Auto-publié",
  },
];

export default function RapportsPage() {
  const auditedCount = RAPPORTS.filter((r) => r.audit).length;
  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Rapports financiers · accès libre
          </div>
          <h1>Sept ans <em>de comptes</em> publiés.</h1>
          <p className="lede">
            Chaque exercice clôt par un <strong>rapport audité par cabinet international</strong> et
            publié intégralement, sans tronçonnage. Les états financiers consolidés, le détail
            par bailleur et l&apos;exécution budgétaire sont annexés.{" "}
            <strong>Aucune réserve</strong> sur les six derniers audits.
          </p>
          <div className="phero-meta">
            <span><strong>9</strong> exercices publiés</span>
            <span><strong>{auditedCount}</strong> rapports audités</span>
            <span>Cabinet <strong>KPMG Afrique Centrale</strong> depuis 2022</span>
            <span>Conforme normes <strong>OHADA / SYSCOA</strong></span>
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
            Téléchargement libre · format PDF/A archivable · données brutes en CSV sur demande.
          </p>
          <div className="rapports-grid">
            {RAPPORTS.map((r) => (
              <a key={r.yr} href="#" className="rapport-card">
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
                    <span className="audit">audité {r.cabinet}</span>
                  ) : (
                    <span>{r.cabinet}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Données ouvertes
          </div>
          <h2>Au-delà du PDF : <em>la donnée brute.</em></h2>
          <p className="lede">
            Toutes les attributions de marchés sont publiées en open data au standard{" "}
            <strong>OCDS v1.1 (Open Contracting Data Standard)</strong> — un format adopté par 50
            gouvernements et organisations multilatérales. Notre flux est mis à jour
            automatiquement à chaque délibération de jury.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <a href="#" className="pbtn pbtn--accent">
              Télécharger CSV <i className="ph ph-download"></i>
            </a>
            <a href="#" className="pbtn">
              Télécharger JSON <i className="ph ph-download"></i>
            </a>
            <a href="#" className="pbtn pbtn--ghost">
              Documentation OCDS <i className="ph ph-arrow-up-right"></i>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
