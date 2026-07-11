import Image from "next/image";
import Link from "next/link";

const PILLARS = [
  {
    num: "01 · Principe",
    titre: "Proximité ",
    em: "terrain",
    intro:
      "Notre équipe est composée à 100% de personnel national tchadien. Le siège est à N'Djamena (Quartier Kabalaye) et l'organisation déploie ses chantiers dans les zones Est et Sud du pays au plus près des bénéficiaires.",
    points: [
      "Siège à N'Djamena · interventions Zone Est & Zone Sud",
      "Personnel 100% tchadien (8 salariés en 2024)",
      "Méthodologie andragogique : valoriser l'expérience des adultes",
    ],
  },
  {
    num: "02 · Principe",
    titre: "Transparence ",
    em: "par défaut",
    intro:
      "Nos états financiers sont déposés chaque année auprès de la Direction Générale des Impôts (système comptable OHADA SYSCOHADA). Notre cadre interne est régi par un Manuel de procédures, un Plan de Management des Projets et une politique PEAS rigoureuse.",
    points: [
      "États financiers déposés (2021, 2022, 2023, 2024)",
      "Cabinet visa : Atrio Consultance, BP 6118 N'Djamena",
      "Mécanisme de signalement EAS / PEAS confidentiel",
    ],
  },
  {
    num: "03 · Principe",
    titre: "Impact ",
    em: "mesurable",
    intro:
      "Chaque programme s'achève par un rapport d'activité chiffré, une évaluation par le commanditaire et un suivi post-action à 3 et 6 mois. La progression des compétences des bénéficiaires est mesurée par tests pré et post-formation.",
    points: [
      "Programme SPE 2024 : taux maîtrise concepts 88%",
      "Programme AUDA-NEPAD 2022 : 145 entrepreneurs formés (3 pays)",
      "Suivi post-formation systématique à 3 mois et 6 mois",
    ],
  },
];

const ZONES = [
  { num: "01", nm: "N'Djamena", em: true, sub: "Siège · Quartier Kabalaye · opérations principales", v: "Siège" },
  { num: "02", nm: "Zone Est", sub: "Chef de projets WAS/BTP · Ingénieur production", v: "Active" },
  { num: "03", nm: "Zone Sud", sub: "Chef de projets WAS/BTP · Ingénieur production", v: "Active" },
  { num: "04", nm: "International", sub: "Missions documentées : Rwanda · Côte d'Ivoire", v: "Ponctuel" },
];

const TIMELINE = [
  {
    yr: "Création",
    titre: "Fondation de ", em: "CHADIA",
    desc: "Association tchadienne sans but lucratif, indépendante et apolitique, pour le développement économique et social du Tchad.",
  },
  {
    yr: "2021–2022 · structuration",
    titre: "Reconnaissance officielle",
    desc: "Dépôt régulier des états financiers normalisés SYSCOHADA. Visa Atrio Consultance, partenaire expert-comptable.",
  },
  {
    yr: "2022 · première mission continentale",
    titre: "Programme AUDA-NEPAD ", em: "(Union Africaine)",
    desc: "Séminaire MPME en ingénierie entrepreneuriale dans 3 pays — N'Djamena, Kigali, Abidjan. 145 entrepreneurs formés, 138 plans d'affaires élaborés.",
    major: true,
  },
  {
    yr: "15 octobre 2022 · gouvernance",
    titre: "Mise en place du ", em: "Bureau Exécutif",
    desc: "Composition officielle : Coordinateur Tidjani SALAH, Trésorier, Secrétaire comptable, Responsable communication. Présidence du CA : Khadidja Bouchoura Youssouf.",
  },
  {
    yr: "2024 · partenariat secteur privé",
    titre: "Programme SPE ", em: "formation entrepreneuriale",
    desc: "Mission pour Solar Power Enterprise — 15 entrepreneurs formés sur 7 modules. Taux de maîtrise 88%, satisfaction 92%, attestation d'excellence.",
    major: true,
  },
  {
    yr: "2024 · clôture exercice",
    titre: "205 M FCFA de produits",
    desc: "Chiffre d'affaires services 205 M FCFA · résultat net 15,6 M FCFA · valeur ajoutée 60,3 M FCFA. Bilan certifié SYSCOHADA, audit comptable confié à Atrio Consultance.",
  },
];

export function MissionContent() {
  return (
    <>
      <section className="hero-full">
        <Image
          className="bg"
          src="/images/tchad/guelta-archei-ennedi.webp"
          alt="La guelta d'Archei dans le massif de l'Ennedi, patrimoine mondial de l'UNESCO, Tchad"
          width={2400}
          height={1802}
          sizes="100vw"
          priority
        />
        <div className="veil"></div>
        <div className="hf-wrap">
          <div className="kicker">Notre mission · qui nous sommes</div>
          <h1>CHADIA, <em>pour le développement</em> du Tchad.</h1>
          <p className="lede">
            <strong>CHADIA — Chadia pour le Développement du Tchad (CDT)</strong> est une association tchadienne sans but lucratif, indépendante et apolitique. Depuis N&apos;Djamena (Quartier Kabalaye), nous opérons dans la <strong>formation professionnelle</strong>, l&apos;<strong>accompagnement entrepreneurial</strong>, l&apos;<strong>eau et l&apos;assainissement</strong>, l&apos;<strong>agriculture / élevage</strong>, l&apos;<strong>éducation</strong> et la <strong>santé / sécurité</strong>.
          </p>
          <div className="hf-meta">
            <span>Siège <strong>N&apos;Djamena · Quartier Kabalaye</strong></span>
            <span><strong>8</strong> salariés (exercice 2024)</span>
            <span>Comptabilité <strong>SYSCOHADA</strong></span>
            <span>Téléphone <strong>+235 65 62 62 40</strong></span>
            <span>BP <strong>6118 N&apos;Djamena</strong></span>
          </div>
        </div>
        <span className="credit">Guelta d&apos;Archei · Ennedi (UNESCO) — photo anmede · CC BY-SA 2.0</span>
      </section>

      <section className="manifesto">
        <div className="manifesto-wrap">
          <div>
            <p className="quote">
              Renforcer les capacités, c&apos;est <em>libérer le potentiel</em> d&apos;un pays.
            </p>
            <p className="quote-by">
              <strong>Tidjani SALAH</strong>Directeur Général · Coordinateur du Bureau Exécutif
            </p>
          </div>
          <div className="body">
            <p>
              CHADIA est née d&apos;un constat simple : les <strong>Micro, Petites et Moyennes Entreprises tchadiennes</strong> représentent l&apos;essentiel du tissu économique, mais font face à des contraintes structurelles — accès limité aux financements, faiblesse des capacités managériales, difficultés d&apos;accès aux marchés. Nous travaillons à lever ces obstacles, projet par projet, entrepreneur par entrepreneur.
            </p>
            <p>
              Nos domaines d&apos;expertise couvrent la <strong>formation professionnelle</strong> (entrepreneuriat, finance, leadership), le <strong>conseil stratégique</strong> pour PME / TPE, l&apos;<strong>élaboration de plans d&apos;affaires bancables</strong>, l&apos;<strong>eau-assainissement (WAS)</strong>, le <strong>BTP</strong>, l&apos;<strong>agriculture-élevage</strong>, l&apos;<strong>éducation</strong> et la <strong>santé</strong>. Nos chantiers déploient des chefs de projets et ingénieurs production dans les Zone Est et Zone Sud du pays.
            </p>
            <p>
              Notre méthodologie repose sur l&apos;<strong>andragogie</strong> (formation des adultes) et la <strong>pédagogie par compétences</strong>. Nos états financiers sont déposés annuellement au système SYSCOHADA et visés par le cabinet <strong>Atrio Consultance</strong>. Toutes nos missions sont sanctionnées par une attestation de bonne exécution du commanditaire.
            </p>
          </div>
        </div>
      </section>

      <section className="pillars">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Trois principes · une boussole
          </div>
          <h2>
            Ce qui guide chaque <em>décision.</em>
          </h2>
          <div className="pillars-grid">
            {PILLARS.map((p) => (
              <div key={p.num} className="pillar">
                <div className="num">{p.num}</div>
                <h3>{p.titre}<em>{p.em}</em></h3>
                <p>{p.intro}</p>
                <ul>
                  {p.points.map((pt) => <li key={pt}>{pt}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="where">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Où nous travaillons
          </div>
          <h2>
            Tchad <em>et au-delà.</em>
          </h2>
          <div className="where-grid">
            <div className="where-list">
              {ZONES.map((p) => (
                <div key={p.num} className="row">
                  <div className="num">{p.num}</div>
                  <div className="nm">
                    {p.em ? <em>{p.nm}</em> : p.nm}
                    <small>{p.sub}</small>
                  </div>
                  <div className="v">{p.v}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 32, background: "var(--color-canvas)", border: "1px solid var(--color-line)", borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--color-sepia)" }}>
                Notre siège est à <strong>N&apos;Djamena (Quartier Kabalaye, en face stade Idriss MHT OUYA)</strong>. L&apos;organigramme prévoit deux zones d&apos;intervention principales pour les chantiers WAS / BTP (eau, assainissement, génie civil). Nos missions de formation entrepreneuriale ont été déployées au Tchad, au Rwanda et en Côte d&apos;Ivoire pour le compte d&apos;institutions continentales.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="story">
        <div className="psection-wrap">
          <div className="story-grid">
            <div>
              <div className="section-eyebrow">
                <span className="rule"></span> Quelques jalons
              </div>
              <h2>
                Au service du <em>terrain.</em>
              </h2>
              <p className="lede" style={{ fontSize: 15 }}>
                De la mise en place du Bureau Exécutif au partenariat avec l&apos;Union Africaine et le secteur privé — quelques étapes structurantes.
              </p>
            </div>
            <div className="timeline">
              {TIMELINE.map((t) => (
                <div key={t.yr} className={`tl-row ${t.major ? "major" : ""}`}>
                  <div className="yr">{t.yr}</div>
                  <h4>{t.titre}{t.em && <em>{t.em}</em>}</h4>
                  <p>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-wrap">
          <div>
            <h3>Vous souhaitez <em>collaborer</em> avec nous ?</h3>
            <p>
              Bailleur, partenaire institutionnel, entreprise du secteur privé, journaliste, organisation de la société civile — nos équipes répondent sous 48 heures ouvrées à tidjani@chadia-ong.org ou au +235 65 62 62 40.
            </p>
          </div>
          <div className="cta-actions">
            <Link href="/contact" className="pbtn pbtn--accent">
              Nous contacter <i className="ph ph-arrow-up-right"></i>
            </Link>
            <Link href="/resultats" className="pbtn pbtn--inverse">
              Voir nos résultats <i className="ph ph-chart-line-up"></i>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
