import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Projet PRECOM · ONG CHADIA",
  description:
    "PRECOM — Renforcement de la résilience communautaire du 1er arrondissement de N'Djaména (Farcha, Milézi, Madjorio). Sous-composante 2.2 du projet PILIER, financée par la Banque mondiale, mise en œuvre par le PNUD, exécutée par l'ONG CHADIA.",
};

const QUARTIERS = [
  { num: "01", nm: "Farcha", em: true, sub: "Quartier riverain, exposé aux crues du fleuve Chari", v: "Prioritaire" },
  { num: "02", nm: "Milézi", sub: "Berges fragilisées : un besoin de drainage prioritaire", v: "Actif" },
  { num: "03", nm: "Madjorio", sub: "Zone habitée où l'assainissement reste à renforcer", v: "Actif" },
];

const ETAPES = [
  {
    yr: "Étape 1 · préparation",
    titre: "Préparation & ", em: "ciblage",
    desc: "Identification des sites d'intervention et des bénéficiaires dans les trois quartiers.",
  },
  {
    yr: "Étape 2 · mobilisation",
    titre: "Mobilisation communautaire",
    desc: "Sensibilisation des habitants et organisation des groupements, avec les délégués de quartier et les chefs de carrés.",
  },
  {
    yr: "Étape 3 · travaux",
    titre: "Curage des caniveaux ", em: "(HIMO)",
    desc: "Assainissement des 6 km de caniveaux traditionnels par la main-d'œuvre locale.",
    major: true,
  },
  {
    yr: "Étape 4 · revenus",
    titre: "AGR & ", em: "accompagnement",
    desc: "Concassage de gravier par les groupements de femmes, formation et épargne.",
    major: true,
  },
  {
    yr: "Étape 5 · durabilité",
    titre: "Suivi & pérennisation",
    desc: "Évaluation des résultats et ancrage durable des acquis dans les quartiers.",
  },
];

const RESULTATS = [
  { n: "i.", t: "Un meilleur drainage et moins d'inondations", s: "6 km de caniveaux curés dans les zones les plus exposées." },
  { n: "ii.", t: "Des conditions sanitaires et un cadre de vie améliorés", s: "Moins d'eaux stagnantes, moins de déchets dans les canaux." },
  { n: "iii.", t: "Des revenus accrus pour les personnes vulnérables", s: "Groupements de femmes équipés, formés et accompagnés." },
  { n: "iv.", t: "Des emplois locaux pour les jeunes et les femmes", s: "L'approche HIMO privilégie la mobilisation humaine à la mécanisation." },
  { n: "v.", t: "Un cadre de vie plus sain, sûr et durable", s: "Une appropriation communautaire qui survit au projet." },
];

const GALERIE = [
  { src: "canal-farcha-panorama.webp", w: 1080, h: 1080, cap: "Canal à ciel ouvert engorgé — Farcha, état initial" },
  { src: "eaux-stagnantes.webp", w: 1080, h: 1080, cap: "Eaux stagnantes au cœur du quartier" },
  { src: "canal-dechets-betail.webp", w: 1080, h: 1080, cap: "Déchets et divagation animale dans le canal" },
  { src: "caniveau-traditionnel.webp", w: 1080, h: 1080, cap: "Caniveau traditionnel avant curage" },
  { src: "mobilisation-quartier.webp", w: 1152, h: 864, cap: "Mobilisation des habitants sur le tracé" },
  { src: "panneau-chantier.webp", w: 1152, h: 864, cap: "Signalisation du chantier — sécurité HIMO" },
  { src: "agent-gilet-canal.webp", w: 1152, h: 864, cap: "Encadrement des travaux le long du canal" },
  { src: "gravilloneuses-groupe.webp", w: 1080, h: 810, cap: "Groupement de femmes gravilloneuses au travail" },
  { src: "equipe-officiels.webp", w: 1080, h: 607, cap: "L'équipe et les acteurs communautaires du projet" },
];

export default function PrecomPage() {
  return (
    <>
      <section className="hero-full">
        <Image
          className="bg"
          src="/images/precom/beneficiaires-arbres.webp"
          alt="Groupement de femmes bénéficiaires réunies à l'ombre des arbres près des tas de gravier"
          width={1080}
          height={810}
          sizes="100vw"
          priority
        />
        <div className="veil"></div>
        <div className="hf-wrap">
          <div className="kicker">Projet en cours · sous-composante 2.2 du projet PILIER</div>
          <h1>PRECOM. La résilience <em>par la communauté.</em></h1>
          <p className="lede">
            <strong>Renforcement de la résilience communautaire du 1ᵉʳ arrondissement de
            N&apos;Djaména — Farcha, Milézi et Madjorio.</strong> Un microprojet financé par la
            Banque mondiale, mis en œuvre par le PNUD et exécuté par l&apos;ONG CHADIA, pour
            l&apos;assainissement et le cadre de vie des quartiers les plus exposés aux inondations.
          </p>
          <div className="hf-actions">
            <span className="badge-live" style={{ color: "var(--pub-yellow)" }}>
              <span className="dot"></span> En exécution — lancé le 10 juin 2026 au siège de CHADIA, Kabalaye
            </span>
          </div>
          <div className="hf-meta">
            <span>Financement <strong>Banque mondiale · don IDA</strong></span>
            <span>Mise en œuvre <strong>PNUD</strong></span>
            <span>Exécution locale <strong>ONG CHADIA</strong></span>
            <span>Zone <strong>1ᵉʳ arrondissement · N&apos;Djaména</strong></span>
          </div>
        </div>
        <span className="credit">Groupements de femmes — Farcha, juin 2026</span>
      </section>

      <section className="counters">
        <div className="counters-wrap">
          <div className="counter">
            <div className="l">Décès liés aux inondations · Tchad 2024</div>
            <div className="v">576</div>
            <div className="d">Le changement climatique frappe un pays pris entre le Chari et le Logone.</div>
          </div>
          <div className="counter">
            <div className="l">Personnes sinistrées · 2024</div>
            <div className="v">1,9 <em>M</em></div>
            <div className="d">À l&apos;échelle nationale, lors de la saison des pluies 2024.</div>
          </div>
          <div className="counter">
            <div className="l">Réseau de drainage curé · 2024</div>
            <div className="v">+250 <em>km</em></div>
            <div className="d">À N&apos;Djaména : la prévention a fait ses preuves. PRECOM prolonge cet effort.</div>
          </div>
          <div className="counter">
            <div className="l">Caniveaux à curer · PRECOM</div>
            <div className="v">6 <em>km</em></div>
            <div className="d">Caniveaux traditionnels assainis en HIMO dans trois quartiers.</div>
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Contexte & enjeux
          </div>
          <h2>N&apos;Djaména face <em>aux inondations.</em></h2>
          <p className="lede">
            Prise en tenaille entre les fleuves Chari et Logone et de fortes pluies, la
            capitale subit de plein fouet le changement climatique. En 2024, elle a mieux
            résisté grâce aux mesures préventives de drainage — c&apos;est dans cette dynamique
            que s&apos;inscrit PRECOM. Farcha-Milézi figure parmi les zones les plus exposées :
            berges fragilisées, débit élevé des fleuves. Le projet agit là où le besoin est
            le plus urgent.
          </p>
          <div className="duo" style={{ marginTop: 40 }}>
            <figure className="pfigure sq">
              <Image src="/images/precom/canal-engorge-rue.webp" alt="Canal engorgé de déchets en pleine rue" width={1080} height={1080} sizes="(max-width: 860px) 100vw, 50vw" />
              <figcaption>Canal engorgé — constat de terrain, 1ᵉʳ arrondissement</figcaption>
            </figure>
            <figure className="pfigure sq">
              <Image src="/images/precom/eaux-stagnantes.webp" alt="Eaux stagnantes noires dans un caniveau de quartier" width={1080} height={1080} sizes="(max-width: 860px) 100vw, 50vw" />
              <figcaption>Eaux stagnantes — à l&apos;origine des inondations et des maladies</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Terrain d&apos;intervention
          </div>
          <h2>Trois quartiers, <em>un même front.</em></h2>
          <div className="where-grid" style={{ marginTop: 36 }}>
            <div className="where-list">
              {QUARTIERS.map((q) => (
                <div key={q.num} className="row">
                  <div className="num">{q.num}</div>
                  <div className="nm">
                    {q.em ? <em>{q.nm}</em> : q.nm}
                    <small>{q.sub}</small>
                  </div>
                  <div className="v">{q.v}</div>
                </div>
              ))}
            </div>
            <figure className="pfigure">
              <Image src="/images/precom/canal-farcha-panorama.webp" alt="Vue panoramique du canal à ciel ouvert de Farcha" width={1080} height={1080} sizes="(max-width: 860px) 100vw, 50vw" style={{ aspectRatio: "4 / 3" }} />
              <figcaption>Le canal à ciel ouvert de Farcha, avant intervention</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Volet 1 · assainissement
          </div>
          <h2>Curage de 6 km <em>de caniveaux.</em></h2>
          <p className="lede">
            Drainage des eaux pluviales et de ruissellement, réduction des risques dans les
            quartiers exposés — des travaux menés en <strong>Haute Intensité de
            Main-d&apos;Œuvre</strong> : la priorité va à l&apos;emploi local plutôt qu&apos;à la
            mécanisation, avec l&apos;implication directe des jeunes et des femmes.
          </p>
          <div className="duo" style={{ marginTop: 40 }}>
            <figure className="pfigure sq">
              <Image src="/images/precom/caniveau-macone-neuf.webp" alt="Caniveau maçonné engorgé de déchets avant le curage" width={1080} height={1080} sizes="(max-width: 860px) 100vw, 50vw" />
              <figcaption>Avant — caniveau maçonné engorgé</figcaption>
            </figure>
            <figure className="pfigure sq">
              <Image src="/images/precom/agent-gilet-canal.webp" alt="Équipes HIMO au curage d'un canal de drainage" width={1152} height={864} sizes="(max-width: 860px) 100vw, 50vw" />
              <figcaption>Pendant — curage HIMO en cours</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="feature-grid">
            <div>
              <div className="section-eyebrow">
                <span className="rule"></span> Volet 2 · activités génératrices de revenus
              </div>
              <h2>Les femmes <em>« gravilloneuses ».</em></h2>
              <p className="lede">
                Concassage et vente de gravier : une AGR structurée pour renforcer
                l&apos;autonomie économique des femmes vulnérables, organisées en groupements.
              </p>
              <div className="impact-list" style={{ maxWidth: "56ch" }}>
                <div className="imp"><div className="n">a.</div><p>Bénéficiaires <small>Femmes vulnérables organisées en groupements.</small></p></div>
                <div className="imp"><div className="n">b.</div><p>Appui matériel <small>Équipements de protection et outils de concassage.</small></p></div>
                <div className="imp"><div className="n">c.</div><p>Revenus <small>Production et commercialisation du gravier.</small></p></div>
                <div className="imp"><div className="n">d.</div><p>Durabilité <small>Formation, épargne et accompagnement de proximité.</small></p></div>
              </div>
            </div>
            <div className="feature-photos">
              <figure className="pfigure tall">
                <Image src="/images/precom/gravilloneuse-concassage.webp" alt="Femme gravilloneuse concassant le gravier" width={1080} height={1080} sizes="(max-width: 900px) 50vw, 25vw" />
                <figcaption>Concassage du gravier</figcaption>
              </figure>
              <figure className="pfigure tall">
                <Image src="/images/precom/gravilloneuses-travail.webp" alt="Groupement de femmes gravilloneuses au travail" width={1080} height={1080} sizes="(max-width: 900px) 50vw, 25vw" />
                <figcaption>Un groupement au travail — Farcha</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className="psection dark">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Approche communautaire
          </div>
          <h2>L&apos;HIMO : l&apos;emploi local <em>au cœur du projet.</em></h2>
          <p className="lede">
            La Haute Intensité de Main-d&apos;Œuvre privilégie la mobilisation humaine plutôt
            que la mécanisation, afin de maximiser l&apos;impact social et économique dans les
            quartiers.
          </p>
          <div className="feature-facts" style={{ fontSize: 13, gap: 40 }}>
            <span>Main-d&apos;œuvre <strong>jeunes & femmes des quartiers</strong></span>
            <span>Participation féminine cible <strong>≥ 30 % (PNUD)</strong></span>
            <span>Terrain <strong>Farcha · Milézi · Madjorio</strong></span>
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Pilotage · du bailleur au terrain
          </div>
          <h2>Financement & <em>gouvernance.</em></h2>
          <div className="chain" style={{ marginTop: 40 }}>
            <div className="node">
              <div className="role">Financement</div>
              <div className="who">Banque mondiale</div>
              <p>Don IDA de 150 M$ — projet PILIER (2023), 6 ans, 4 composantes.</p>
            </div>
            <div className="node">
              <div className="role">Composante 2.2</div>
              <div className="who">Interventions communautaires</div>
              <p>20 M$ dédiés à la résilience communautaire à N&apos;Djaména.</p>
            </div>
            <div className="node">
              <div className="role">Mise en œuvre</div>
              <div className="who">PNUD</div>
              <p>Agent de mise en œuvre de la sous-composante.</p>
            </div>
            <div className="node hot">
              <div className="role">Exécution locale</div>
              <div className="who">ONG CHADIA</div>
              <p>Exécution de terrain via le microprojet PRECOM.</p>
            </div>
          </div>
          <p style={{ margin: "32px 0 0", fontSize: 14, color: "var(--color-shale)", maxWidth: "70ch", lineHeight: 1.6 }}>
            Aux côtés du projet : la <strong style={{ color: "var(--color-ink)" }}>Mairie du 1ᵉʳ arrondissement</strong> (appui
            institutionnel et validation locale), les <strong style={{ color: "var(--color-ink)" }}>délégués de quartier et chefs
            de carrés</strong>, les associations de jeunes et de femmes, et les populations
            bénéficiaires — au cœur de la mise en œuvre et de l&apos;appropriation.
          </p>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="story-grid">
            <div>
              <div className="section-eyebrow">
                <span className="rule"></span> Mise en œuvre
              </div>
              <h2>Les grandes <em>étapes.</em></h2>
              <p className="lede" style={{ fontSize: 15 }}>
                Les phases s&apos;enchaînent sur la durée du microprojet, de l&apos;identification
                des sites à la pérennisation des acquis.
              </p>
            </div>
            <div className="timeline">
              {ETAPES.map((t) => (
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

      <section className="psection">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Impact
          </div>
          <h2>Résultats <em>attendus.</em></h2>
          <div className="impact-list" style={{ marginTop: 36, maxWidth: "72ch" }}>
            {RESULTATS.map((r) => (
              <div key={r.n} className="imp">
                <div className="n">{r.n}</div>
                <p>{r.t}<small>{r.s}</small></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="psection alt">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Galerie · reportage de terrain
          </div>
          <h2>Le projet <em>en images.</em></h2>
          <div className="pgallery" style={{ marginTop: 40 }}>
            {GALERIE.map((g) => (
              <figure key={g.src} className="pfigure">
                <Image src={`/images/precom/${g.src}`} alt={g.cap} width={g.w} height={g.h} sizes="(max-width: 860px) 100vw, 50vw" />
                <figcaption>{g.cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="feature-grid">
            <div>
              <div className="section-eyebrow">
                <span className="rule"></span> 10 juin 2026 · Kabalaye
              </div>
              <h2>Le lancement <em>officiel.</em></h2>
              <p className="lede">
                La cérémonie de lancement s&apos;est tenue le 10 juin 2026 au siège de CHADIA,
                à Kabalaye (côté ouest du stade Idriss Mahamat Ouya), en présence des
                partenaires, des autorités locales et des représentants des communautés
                bénéficiaires.
              </p>
              <div className="phero-meta" style={{ borderTop: "1px solid var(--color-line)" }}>
                <span>Devise du projet <strong>« Valoriser, responsabiliser, faire sortir le génie de l&apos;Homme »</strong></span>
              </div>
            </div>
            <div>
              <figure className="pfigure wide" style={{ marginBottom: 20 }}>
                <Image src="/images/precom/lancement-salle.webp" alt="Salle de la cérémonie de lancement du projet PRECOM" width={1080} height={607} sizes="(max-width: 860px) 100vw, 50vw" />
                <figcaption>Cérémonie de lancement — siège CHADIA, Kabalaye</figcaption>
              </figure>
              <figure className="pfigure wide">
                <Image src="/images/precom/lancement-intervenant.webp" alt="Intervenant présentant le projet PRECOM lors du lancement" width={1080} height={607} sizes="(max-width: 860px) 100vw, 50vw" />
                <figcaption>Présentation du microprojet aux parties prenantes</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-wrap">
          <div>
            <h3>Agissons ensemble pour un quartier <em>plus sain et plus résilient.</em></h3>
            <p>
              La réussite du projet repose sur la mobilisation et l&apos;appropriation de tous.
              Habitants, associations, partenaires : contactez l&apos;équipe PRECOM à
              tidjani@chadia-ong.org ou au +235 65 62 62 40.
            </p>
          </div>
          <div className="cta-actions">
            <Link href="/contact" className="pbtn pbtn--accent">
              Contacter l&apos;équipe <i className="ph ph-arrow-up-right"></i>
            </Link>
            <Link href="/resultats" className="pbtn pbtn--inverse">
              Résultats publiés <i className="ph ph-chart-bar"></i>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
