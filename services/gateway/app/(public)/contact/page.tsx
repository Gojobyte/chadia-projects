export const metadata = {
  title: "Contact · CHADIA",
  description:
    "Bailleur, fournisseur, journaliste, partenaire — réponse sous 48 heures ouvrées. Mécanisme de plainte indépendant disponible.",
};

const CHANNELS = [
  {
    titre: "Pour ",
    em: "les bailleurs",
    desc: "Conventions, financement, comptes-rendus.",
    contact: "bailleurs@chadia.td",
    delay: "Réponse < 48h ouvrées",
  },
  {
    titre: "Pour ",
    em: "les fournisseurs",
    desc: "Inscription, mises à jour de dossier, suivi de soumission.",
    contact: "fournisseurs@chadia.td",
    delay: "Réponse < 48h ouvrées",
  },
  {
    titre: "Pour ",
    em: "la presse",
    desc: "Demandes d'interviews, données chiffrées, accès terrain.",
    contact: "presse@chadia.td",
    delay: "Réponse < 24h",
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
          <h1>Une équipe <em>à votre écoute.</em></h1>
          <p className="lede">
            Bailleur, fournisseur, journaliste, étudiant·e, organisation partenaire ou
            bénéficiaire — nos équipes sont à votre disposition.{" "}
            <strong>Réponse sous 48 heures ouvrées.</strong> Pour les signalements relevant du
            mécanisme de plainte, un canal indépendant est disponible plus bas sur cette page.
          </p>
          <div className="phero-meta">
            <span>Siège <strong>N&apos;Djamena</strong></span>
            <span>5 bureaux régionaux</span>
            <span>Téléphone <strong>+235 22 45 11 28</strong></span>
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
                Choisissez le canal correspondant à votre demande. Pour les questions générales,
                utilisez le formulaire ci-dessous.
              </p>

              <form
                className="contact-form"
                action="mailto:contact@chadia.td"
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
                    <option>Bailleur — convention ou financement</option>
                    <option>Fournisseur — inscription ou suivi</option>
                    <option>Presse — demande d&apos;interview</option>
                    <option>Partenariat opérationnel</option>
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
                <span className="rule"></span> Coordonnées
              </div>
              <dl>
                <dt>Siège · N&apos;Djamena</dt>
                <dd>
                  <strong>Avenue Mobutu, BP 1284</strong><br/>
                  N&apos;Djamena, République du Tchad<br/>
                  Lundi–vendredi · 8h–17h
                </dd>
                <dt>Téléphone</dt>
                <dd><strong>+235 22 45 11 28</strong></dd>
                <dt>E-mails directs</dt>
                <dd>
                  {CHANNELS.map((c) => (
                    <div key={c.contact} style={{ marginBottom: 8 }}>
                      <strong>{c.contact}</strong><br/>
                      <span style={{ fontSize: 12, color: "var(--color-stone)" }}>
                        {c.titre}{c.em} · {c.delay}
                      </span>
                    </div>
                  ))}
                </dd>
                <dt>Bureaux régionaux</dt>
                <dd>Bol · Moundou · Abéché · Mongo · Mao</dd>
                <dt>Mécanisme de plainte indépendant</dt>
                <dd>
                  <strong>plainte@chadia-mediation.td</strong><br/>
                  Canal anonyme, traité sous 7 jours par un médiateur externe désigné par le
                  comité d&apos;audit.
                </dd>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
