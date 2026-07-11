import Image from "next/image";
import Link from "next/link";

const DOMAINS = [
  {
    num: "01",
    titre: "Formation ",
    em: "professionnelle",
    desc: "Entrepreneuriat, management, finance d'entreprise et leadership — une pédagogie andragogique qui valorise l'expérience des adultes.",
  },
  {
    num: "02",
    titre: "Conseil & ",
    em: "entrepreneuriat",
    desc: "Accompagnement des PME / TPE : plans d'affaires bancables, études de faisabilité, coaching des porteurs de projets, accès au financement.",
  },
  {
    num: "03",
    titre: "Eau, assainissement ",
    em: "& BTP",
    desc: "Chantiers WAS et génie civil déployés dans les zones Est et Sud, avec chefs de projets et ingénieurs production sur le terrain.",
  },
  {
    num: "04",
    titre: "Agriculture ",
    em: "& élevage",
    desc: "Appui aux filières agro-pastorales : cultures vivrières, transformation agroalimentaire, produits laitiers et services agricoles.",
  },
  {
    num: "05",
    titre: "Éducation",
    em: "",
    desc: "Programmes de renforcement des capacités et transfert de compétences, au Tchad et dans la sous-région.",
  },
  {
    num: "06",
    titre: "Santé, sécurité ",
    em: "& environnement",
    desc: "Missions pour le Ministère de la Santé Publique, cadre HSE interne et politique de sauvegarde PEAS rigoureuse.",
  },
];

const PARTNERS = [
  "Banque mondiale",
  "PNUD",
  "AUDA-NEPAD · Union Africaine",
  "Programme Alimentaire Mondial",
  "Ministère de la Santé Publique",
  "Solar Power Enterprise",
];

export function HomeContent() {
  return (
    <>
      <section className="hero-full">
        <Image
          className="bg"
          src="/images/precom/chantier-himo-arbres.webp"
          alt="Chantier communautaire HIMO à l'ombre des arbres, 1er arrondissement de N'Djaména"
          width={1152}
          height={864}
          sizes="100vw"
          priority
        />
        <div className="veil"></div>
        <div className="hf-wrap">
          <div className="kicker">ONG nationale · N&apos;Djamena, Tchad</div>
          <h1>Le développement du Tchad, <em>projet par projet.</em></h1>
          <p className="lede">
            <strong>CHADIA</strong> est une ONG tchadienne indépendante et apolitique.
            Nous formons des entrepreneurs, assainissons des quartiers, accompagnons
            des communautés — avec une équipe 100&nbsp;% nationale et une exigence :
            <strong> des résultats mesurables, publiés et vérifiables</strong>.
          </p>
          <div className="hf-actions">
            <Link href="/precom" className="pbtn pbtn--accent">
              Découvrir le projet PRECOM <i className="ph ph-arrow-right"></i>
            </Link>
            <Link href="/mission" className="pbtn pbtn--inverse">
              Notre mission
            </Link>
          </div>
          <div className="hf-meta">
            <span>Devise <strong>« Valoriser, responsabiliser, faire sortir le génie de l&apos;Homme »</strong></span>
            <span>Agrément <strong>N° 154/PCMT/PMT/MEPDCI/SE/SPONGAH/2021</strong></span>
          </div>
        </div>
        <span className="credit">Chantier HIMO — N&apos;Djaména, 2026</span>
      </section>

      <section className="counters">
        <div className="counters-wrap">
          <div className="counter">
            <div className="l">Caniveaux à curer · PRECOM</div>
            <div className="v">6 <em>km</em></div>
            <div className="d">Drainage assaini en HIMO dans le 1ᵉʳ arrondissement de N&apos;Djaména.</div>
          </div>
          <div className="counter">
            <div className="l">Entrepreneurs formés · AUDA-NEPAD</div>
            <div className="v">145</div>
            <div className="d">Séminaire MPME dans 3 pays — N&apos;Djamena, Kigali, Abidjan (2022).</div>
          </div>
          <div className="counter">
            <div className="l">Maîtrise des concepts · SPE 2024</div>
            <div className="v">88 <em>%</em></div>
            <div className="d">Mesurée par tests pré / post-formation. Satisfaction : 92&nbsp;%.</div>
          </div>
          <div className="counter">
            <div className="l">Produits · exercice 2024</div>
            <div className="v">205 <em>M FCFA</em></div>
            <div className="d">États financiers SYSCOHADA déposés, visés par Atrio Consultance.</div>
          </div>
        </div>
      </section>

      <section className="psection dark">
        <div className="psection-wrap">
          <div className="feature-grid">
            <div>
              <div className="badge-live" style={{ marginBottom: 18 }}>
                <span className="dot"></span> Projet en cours d&apos;exécution
              </div>
              <h2>PRECOM. Contre les inondations, <em>avec les habitants.</em></h2>
              <p className="lede">
                Sous-composante 2.2 du projet PILIER, financé par la <strong style={{ color: "var(--color-page)" }}>Banque
                mondiale</strong> (don IDA), mis en œuvre par le <strong style={{ color: "var(--color-page)" }}>PNUD</strong> et
                exécuté par CHADIA : curage de 6&nbsp;km de caniveaux en Haute Intensité de
                Main-d&apos;Œuvre et activités génératrices de revenus pour les femmes des
                quartiers Farcha, Milézi et Madjorio.
              </p>
              <div className="feature-facts">
                <span>Lancement <strong>10 juin 2026</strong></span>
                <span>Quartiers <strong>Farcha · Milézi · Madjorio</strong></span>
                <span>Participation féminine <strong>≥ 30 %</strong></span>
              </div>
              <div style={{ marginTop: 28 }}>
                <Link href="/precom" className="pbtn pbtn--inverse">
                  Voir le projet en détail <i className="ph ph-arrow-up-right"></i>
                </Link>
              </div>
            </div>
            <div className="feature-photos">
              <figure className="pfigure tall">
                <Image src="/images/precom/gravilloneuse-concassage.webp" alt="Femme gravilloneuse au concassage du gravier" width={1080} height={1080} sizes="(max-width: 900px) 50vw, 25vw" />
                <figcaption>AGR — concassage du gravier</figcaption>
              </figure>
              <figure className="pfigure tall">
                <Image src="/images/precom/canal-engorge-rue.webp" alt="Canal engorgé de déchets dans le 1er arrondissement" width={1080} height={1080} sizes="(max-width: 900px) 50vw, 25vw" />
                <figcaption>Avant curage — Farcha</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Six domaines · un même terrain
          </div>
          <h2>Ce que nous <em>faisons.</em></h2>
          <div className="domains-grid" style={{ marginTop: 40 }}>
            {DOMAINS.map((d) => (
              <div key={d.num} className="domain">
                <div className="num">{d.num}</div>
                <h3>{d.titre}{d.em && <em>{d.em}</em>}</h3>
                <p>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="photo-band">
        <Image
          src="/images/precom/mobilisation-quartier.webp"
          alt="Mobilisation communautaire dans une rue du 1er arrondissement de N'Djaména"
          width={1152}
          height={864}
          sizes="100vw"
        />
        <div className="pb-veil"></div>
        <blockquote>
          « Valoriser, responsabiliser, <em>faire sortir le génie de l&apos;Homme.</em> »
          <cite>Devise de l&apos;ONG CHADIA</cite>
        </blockquote>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Le terrain, en images
          </div>
          <h2>La preuve <em>par l&apos;image.</em></h2>
          <div className="home-gallery" style={{ marginTop: 44 }}>
            <figure className="pfigure">
              <Image src="/images/precom/gravilloneuses-travail.webp" alt="Femmes gravilloneuses au travail sur le gravier" width={1080} height={1080} sizes="(max-width: 860px) 50vw, 25vw" />
              <figcaption>Le concassage, source de revenus</figcaption>
            </figure>
            <figure className="pfigure">
              <Image src="/images/precom/gravilloneuses-groupe.webp" alt="Groupe de femmes gravilloneuses bénéficiaires des AGR" width={1080} height={810} sizes="(max-width: 860px) 50vw, 25vw" />
              <figcaption>Femmes gravilloneuses — AGR</figcaption>
            </figure>
            <figure className="pfigure">
              <Image src="/images/precom/agent-gilet-canal.webp" alt="Agent CHADIA en gilet au curage d'un canal de drainage" width={1152} height={864} sizes="(max-width: 860px) 50vw, 25vw" />
              <figcaption>Curage en cours — HIMO</figcaption>
            </figure>
            <figure className="pfigure">
              <Image src="/images/precom/lancement-intervenant.webp" alt="Séance de mobilisation communautaire lors du lancement du projet" width={1080} height={607} sizes="(max-width: 860px) 50vw, 25vw" />
              <figcaption>Mobilisation — lancement du projet</figcaption>
            </figure>
          </div>
          <div style={{ marginTop: 36 }}>
            <Link href="/precom" className="pbtn pbtn--ghost">
              Voir le reportage complet <i className="ph ph-images"></i>
            </Link>
          </div>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Ils nous font confiance
          </div>
          <div className="partners-strip">
            {PARTNERS.map((p, i) => (
              <span key={p}>
                {i > 0 && <span className="sep">·&nbsp;&nbsp;</span>}
                <em>{p}</em>
              </span>
            ))}
          </div>
          <p style={{ margin: "24px 0 0", fontSize: 14, color: "var(--color-shale)", maxWidth: "62ch", lineHeight: 1.55 }}>
            Chaque mission est sanctionnée par une attestation de bonne exécution du
            commanditaire. Nos résultats sont documentés et publiés —{" "}
            <Link href="/resultats" style={{ color: "var(--color-terracotta)" }}>consultez-les</Link>.
            États financiers audités disponibles sur demande pour nos bailleurs et partenaires.
          </p>
        </div>
      </section>

      <section className="cta">
        <div className="cta-wrap">
          <div>
            <h3>Vous souhaitez <em>collaborer</em> avec nous ?</h3>
            <p>
              Bailleur, partenaire institutionnel, entreprise, journaliste, organisation de
              la société civile — nos équipes répondent sous 48 heures ouvrées à
              tidjani@chadia-ong.org ou au +235 65 62 62 40.
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
