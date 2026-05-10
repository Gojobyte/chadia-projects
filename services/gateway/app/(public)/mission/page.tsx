import Link from "next/link";

export const metadata = {
  title: "Notre mission · CHADIA",
  description:
    "ONG humanitaire et de développement créée à N'Djamena en 2014. Servir les communautés du bassin du Lac Tchad.",
};

const PILLARS = [
  {
    num: "01 · Principe",
    titre: "Proximité ",
    em: "radicale",
    intro:
      "92% de nos équipes sont tchadiennes ou camerounaises. Nos bureaux sont dans les zones d'intervention — pas seulement à N'Djamena. Les décisions opérationnelles sont prises au plus près du terrain.",
    points: [
      "5 bureaux régionaux : Bol, Moundou, Abéché, Mongo, Mao",
      "Recrutement local prioritaire à compétence égale",
      "Comités villageois associés à 100% des projets",
    ],
  },
  {
    num: "02 · Principe",
    titre: "Transparence ",
    em: "par défaut",
    intro:
      "Tous nos marchés, contrats et bilans sont publiés en ligne — par défaut, sans demande préalable. Nous publions également les marchés non attribués et les recours pour permettre un contrôle citoyen complet.",
    points: [
      "Données ouvertes au format OCDS v1.1",
      "Audit financier annuel par cabinet international",
      "Mécanisme de plainte indépendant",
    ],
  },
  {
    num: "03 · Principe",
    titre: "Économie ",
    em: "locale",
    intro:
      "Nous privilégions les fournisseurs locaux et les PME du bassin du Lac, même quand cela coûte un peu plus cher. L'argent humanitaire doit irriguer l'économie qu'il soutient — pas seulement importer des biens.",
    points: [
      "36% du parc fournisseurs sont des PME locales",
      "Réservation de lots aux PME < 50 M FCFA",
      "Programme d'accompagnement à la conformité",
    ],
  },
];

const PAYS = [
  { num: "01", nm: "Tchad", em: true, sub: "Pays principal · 9 provinces", v: "94", unit: "%" },
  { num: "02", nm: "Cameroun", sub: "Extrême-Nord · zone d'accueil réfugiés", v: "3", unit: "%" },
  { num: "03", nm: "RCA", sub: "Préfecture de la Vakaga", v: "2", unit: "%" },
  { num: "04", nm: "Soudan", sub: "Réponse Darfour · partenariat OCHA", v: "1", unit: "%" },
];

const TIMELINE = [
  { yr: "2014 · fondation", titre: "Création de CHADIA ", em: "à N'Djamena", desc: "Création par 7 médecins, ingénieurs et travailleurs sociaux tchadiens, en réponse à la crise nutritionnelle dans le bassin du Lac.", major: true },
  { yr: "2016 · première convention bailleur", titre: "Accord-cadre avec ECHO", desc: "Première convention pluriannuelle avec la direction humanitaire européenne — programme nutrition de 1,8 M€ sur 3 ans." },
  { yr: "2019 · agrément", titre: "Reconnaissance d'utilité publique", desc: "Agrément officiel par décret présidentiel. CHADIA devient la première ONG nationale tchadienne RUP.", major: true },
  { yr: "2021 · ouverture régionale", titre: "Extension Cameroun & RCA", desc: "Ouverture d'antennes à Maroua (Cameroun) et Birao (RCA) pour accompagner les mouvements transfrontaliers de populations." },
  { yr: "2024 · transparence", titre: "Lancement du ", em: "registre public", desc: "Mise en ligne de la plateforme de transparence des marchés. CHADIA devient la 1ʳᵉ ONG francophone à publier ses marchés en open data OCDS.", major: true },
  { yr: "2026 · aujourd'hui", titre: "148 salariés · 12,4 Mds FCFA gérés", desc: "Déploiement de CHADIA Projects, notre copilote numérique de gestion de cycle, pour automatiser la transparence sur l'ensemble du portefeuille." },
];

export default function MissionPage() {
  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Notre mission · qui nous sommes
          </div>
          <h1>Servir les communautés du <em>bassin du Lac.</em></h1>
          <p className="lede">
            <strong>CHADIA — pour le développement du Tchad</strong> est une ONG humanitaire et de
            développement créée à N&apos;Djamena en 2014. Nous intervenons dans les zones rurales
            et péri-urbaines du Tchad, du Cameroun et de la République Centrafricaine — au plus
            près des populations affectées par les crises alimentaires, climatiques et sécuritaires.
          </p>
          <div className="phero-meta">
            <span>Créée en <strong>2014</strong></span>
            <span><strong>148</strong> salariés · 92% nationaux</span>
            <span><strong>4 pays</strong> d&apos;intervention</span>
            <span><strong>2,3 M</strong> bénéficiaires depuis 2014</span>
            <span>Reconnue d&apos;utilité publique <strong>2019</strong></span>
          </div>
        </div>
      </section>

      <section className="manifesto">
        <div className="manifesto-wrap">
          <div>
            <p className="quote">
              Une humanitaire qui rend des comptes <em>à ceux qu&apos;elle sert</em> avant ses bailleurs.
            </p>
            <p className="quote-by">
              <strong>Aïcha Saleh</strong>Directrice générale · co-fondatrice
            </p>
          </div>
          <div className="body">
            <p>
              CHADIA est née d&apos;un constat simple : dans le bassin du Lac Tchad, les communautés
              affectées par les crises savent rarement <strong>combien d&apos;argent leur est destiné,
              qui le gère, ni à quoi il sert</strong>. Nous voulons changer cela — en travaillant au
              plus près du terrain, avec des équipes nationales, et en publiant l&apos;intégralité de
              nos décisions de marché.
            </p>
            <p>
              Nos programmes répondent aux urgences alimentaires et sanitaires, mais aussi à la
              résilience long terme — accès à l&apos;eau, santé maternelle, éducation, agroécologie.
              Nous travaillons en partenariat étroit avec les autorités locales, les organisations
              de la société civile tchadienne et les communautés bénéficiaires elles-mêmes, qui
              co-construisent nos plans d&apos;action.
            </p>
            <p>
              Nous sommes financés par <strong>l&apos;Union Européenne, la Banque Mondiale, l&apos;Agence
              Française de Développement, les Nations Unies et l&apos;USAID</strong>, ainsi que par les
              dons de particuliers et d&apos;entreprises tchadiennes. Notre comptabilité, nos audits
              annuels et l&apos;intégralité de nos marchés sont publiés en accès libre sur ce site.
            </p>
          </div>
        </div>
      </section>

      <section className="pillars">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Trois principes · une boussole
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "22ch" }}>
            Ce qui guide chaque <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>décision.</em>
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
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "22ch" }}>
            Quatre pays, <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>douze provinces.</em>
          </h2>
          <div className="where-grid">
            <div className="where-list">
              {PAYS.map((p) => (
                <div key={p.num} className="row">
                  <div className="num">{p.num}</div>
                  <div className="nm">
                    {p.em ? <em>{p.nm}</em> : p.nm}
                    <small>{p.sub}</small>
                  </div>
                  <div className="v">{p.v}<em>{p.unit}</em></div>
                </div>
              ))}
            </div>
            <div style={{ padding: 32, background: "var(--color-canvas)", border: "1px solid var(--color-line)", borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--color-sepia)" }}>
                Notre siège est à N&apos;Djamena. Nos cinq bureaux régionaux — <strong>Bol, Moundou,
                Abéché, Mongo, Mao</strong> — couvrent l&apos;ensemble du bassin du Lac et les zones
                d&apos;intervention transfrontalières au Cameroun, en RCA et au Soudan.
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
                <span className="rule"></span> Notre histoire
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 24px" }}>
                Douze années sur le <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>terrain.</em>
              </h2>
              <p className="lede" style={{ fontSize: 15 }}>
                D&apos;un collectif de bénévoles tchadiens à une ONG de référence du bassin du Lac.
                Quelques jalons qui ont compté.
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
              Bailleur, fournisseur, journaliste, étudiant·e, organisation partenaire — nos
              équipes sont à votre disposition. Réponse sous 48 heures ouvrées.
            </p>
          </div>
          <div className="cta-actions">
            <Link href="/contact" className="pbtn pbtn--accent">
              Nous contacter <i className="ph ph-arrow-up-right"></i>
            </Link>
            <Link href="/rapports" className="pbtn pbtn--inverse">
              Lire le rapport 2025 <i className="ph ph-file-pdf"></i>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
