export const metadata = {
  title: "Contact · ONG CHADIA",
  description:
    "ONG CHADIA — Quartier Kabalaye, BP 6118 N'Djamena. Téléphone +235 65 62 62 40 · tidjani@chadia-ong.org.",
};

const CHANNELS = [
  {
    titre: "Direction ",
    em: "Générale",
    desc: "Conventions, partenariats institutionnels, missions stratégiques.",
    contact: "tidjani@chadia-ong.org",
    delay: "Réponse < 48h ouvrées",
  },
  {
    titre: "Programmes ",
    em: "& projets",
    desc: "Suivi des programmes, planification de missions, demandes opérationnelles.",
    contact: "tidjani@chadia-ong.org",
    delay: "Réponse < 48h ouvrées",
  },
  {
    titre: "Signalement ",
    em: "EAS / PEAS",
    desc: "Mécanisme confidentiel pour tout incident d'exploitation, abus, harcèlement.",
    contact: "Voie de référence interne PEAS",
    delay: "Traitement sous 7 jours",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Contact · une porte ouverte
          </div>
          <h1>L&apos;équipe <em>de CHADIA</em> à votre écoute.</h1>
          <p className="lede">
            Bailleur, partenaire institutionnel, entreprise du secteur privé, journaliste, organisation de la société civile, ou bénéficiaire d&apos;un de nos programmes — nos équipes sont à votre disposition. <strong>Réponse sous 48 heures ouvrées.</strong> Pour les signalements relevant du mécanisme PEAS / EAS, un canal interne confidentiel est disponible plus bas sur cette page.
          </p>
          <div className="phero-meta">
            <span>Siège <strong>Quartier Kabalaye · avenue Bezo · N&apos;Djamena</strong></span>
            <span>Téléphone <strong>+235 65 62 62 40</strong></span>
            <span>Mobile <strong>+235 92 29 94 36</strong></span>
            <span>E-mail <strong>tidjani@chadia-ong.org</strong></span>
            <span>N° d&apos;agrément <strong>154/PCMT/PMT/MEPDCI/SE/SPONGAH/2021</strong></span>
            <span>Lundi → vendredi · 8h–17h</span>
          </div>
        </div>
      </section>

      <section className="psection">
        <div className="psection-wrap">
          <div className="contact-grid">
            <div>
              <div className="section-eyebrow">
                <span className="rule"></span> Écrivez-nous
              </div>
              <h2>Un message, <em>une réponse.</em></h2>
              <p className="lede" style={{ fontSize: 15 }}>
                Le formulaire ci-dessous est traité par la coordination de l&apos;ONG. Précisez l&apos;objet de votre demande pour qu&apos;elle soit routée au bon interlocuteur (partenariats institutionnels, programmes, communication, sauvegarde).
              </p>

              <form
                className="contact-form"
                action="mailto:tidjani@chadia-ong.org"
                method="post"
                encType="text/plain"
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label htmlFor="prenom">Prénom</label>
                    <input id="prenom" name="prenom" required />
                  </div>
                  <div>
                    <label htmlFor="nom">Nom</label>
                    <input id="nom" name="nom" required />
                  </div>
                </div>
                <div>
                  <label htmlFor="email">E-mail professionnel</label>
                  <input id="email" type="email" name="email" required placeholder="prenom@organisation.org" />
                </div>
                <div>
                  <label htmlFor="organisation">Organisation</label>
                  <input id="organisation" name="organisation" />
                </div>
                <div>
                  <label htmlFor="objet">Objet de la demande</label>
                  <select id="objet" name="objet">
                    <option>Demande d&apos;information générale</option>
                    <option>Partenariat institutionnel (bailleur, ONG, agence)</option>
                    <option>Partenariat secteur privé (formation, conseil)</option>
                    <option>Suivi d&apos;un programme en cours</option>
                    <option>Demande de presse / communication</option>
                    <option>Demande d&apos;emploi / stage</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" required placeholder="Votre demande, en quelques lignes…"></textarea>
                </div>
                <button type="submit" className="pbtn pbtn--accent" style={{ justifySelf: "start" }}>
                  Envoyer le message <i className="ph ph-paper-plane-tilt"></i>
                </button>
              </form>
            </div>

            <aside className="contact-info">
              <div className="section-eyebrow">
                <span className="rule"></span> Coordonnées officielles
              </div>
              <dl>
                <dt>Siège · N&apos;Djamena</dt>
                <dd>
                  <strong>Quartier Kabalaye</strong><br/>
                  En face stade Idriss MHT OUYA<br/>
                  N&apos;Djamena, République du Tchad
                </dd>
                <dt>Boîte postale</dt>
                <dd><strong>BP 6118 N&apos;Djamena</strong></dd>
                <dt>Téléphones</dt>
                <dd>
                  <strong>+235 65 62 62 40</strong><br/>
                  <strong>+235 92 29 94 36</strong><br/>
                  <span style={{ fontSize: 12, color: "var(--color-stone)" }}>Lundi → vendredi · 8h–17h (UTC+1)</span>
                </dd>
                <dt>E-mail</dt>
                <dd><strong>tidjani@chadia-ong.org</strong></dd>
                <dt>Direction Générale</dt>
                <dd>
                  <strong>Tidjani SALAH</strong><br/>
                  Coordinateur du Bureau Exécutif<br/>
                  Directeur Général
                </dd>
                <dt>Canaux thématiques</dt>
                <dd>
                  {CHANNELS.map((c) => (
                    <div key={c.titre + c.em} style={{ marginBottom: 10 }}>
                      <strong>{c.titre}{c.em}</strong><br/>
                      <span style={{ fontSize: 12, color: "var(--color-stone)" }}>
                        {c.desc} · {c.delay}
                      </span>
                    </div>
                  ))}
                </dd>
                <dt>Expert-comptable</dt>
                <dd>
                  <strong>Atrio Consultance</strong><br/>
                  Conseil-Formation-Gestion<br/>
                  BP 6118 N&apos;Djamena
                </dd>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
