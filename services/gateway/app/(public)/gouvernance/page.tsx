import Link from "next/link";

export const metadata = {
  title: "Gouvernance · ONG CHADIA",
  description:
    "Association tchadienne sans but lucratif. Conseil d'administration, bureau exécutif, structure opérationnelle de l'ONG CHADIA pour le développement du Tchad.",
};

const STRUCT = [
  {
    n: "01",
    nm: "Assemblée Générale",
    sub: "Instance souveraine — réunit les membres fondateurs et adhérents. Vote du plan stratégique, validation des comptes annuels, élection du Conseil d'administration.",
    role: "Souveraine",
    freq: "Annuelle",
  },
  {
    n: "02",
    nm: "Conseil ",
    em: "d'administration",
    sub: "3 membres élus en assemblée générale — supervise les orientations stratégiques, garantit la conformité aux statuts, valide les engagements financiers majeurs. Acté le 15 octobre 2022.",
    role: "Stratégie & contrôle",
    freq: "Trimestriel",
  },
  {
    n: "03",
    nm: "Bureau ",
    em: "Exécutif",
    sub: "Équipe opérationnelle dirigée par le Coordinateur — pilote l'exécution des programmes, la trésorerie, les achats, la communication. Acte du 15 octobre 2022.",
    role: "Exécution",
    freq: "Continu",
  },
  {
    n: "04",
    nm: "Responsable des programmes",
    sub: "Coordonne 4 directions techniques : WAS/BTP (Eau-assainissement), Entreprenariat/Formation, Éducation, Agriculture/Élevage. Supervise Zone Est et Zone Sud.",
    role: "Programmes",
    freq: "Continu",
  },
  {
    n: "05",
    nm: "Audit & Conformité",
    sub: "Audit interne, Passation de Marché, Suivi & Évaluation, Responsable Santé/Sécurité/Environnement. Cabinet visa Atrio Consultance pour les états financiers SYSCOHADA.",
    role: "Conformité",
    freq: "Continu",
  },
];

export default function GouvernancePage() {
  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Gouvernance · qui décide chez nous
          </div>
          <h1>Décider <em>près du terrain,</em> rendre des comptes <em>en clair.</em></h1>
          <p className="lede">
            <strong>CHADIA est une association tchadienne sans but lucratif</strong>, indépendante et apolitique. Notre gouvernance s&apos;appuie sur un <strong>Conseil d&apos;administration</strong> de 3 membres élus en assemblée générale et un <strong>Bureau Exécutif</strong> dirigé par un Coordinateur. La composition officielle a été actée le <strong>15 octobre 2022</strong>.
          </p>
          <div className="phero-meta">
            <span>Statut <strong>Association tchadienne sans but lucratif</strong></span>
            <span>Siège <strong>Quartier Kabalaye · N&apos;Djamena</strong></span>
            <span>BP <strong>6118 N&apos;Djamena</strong></span>
            <span>Comptabilité <strong>SYSCOHADA</strong> · cabinet Atrio Consultance</span>
          </div>
        </div>
      </section>

      <section className="struct">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Structure de décision
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 32px", maxWidth: "22ch" }}>
            Cinq instances, <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>une chaîne claire.</em>
          </h2>
          {STRUCT.map((s) => (
            <div key={s.n} className="struct-row">
              <div className="n">{s.n}</div>
              <div className="nm">
                {s.nm}{s.em && <em>{s.em}</em>}
                <small>{s.sub}</small>
              </div>
              <div className="role">{s.role}</div>
              <div className="freq">{s.freq}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="ethics">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Éthique & sauvegarde
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Trois engagements <em>fermes.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15, color: "rgba(250,247,241,0.78)" }}>
            La sauvegarde des bénéficiaires et de notre personnel est encadrée par un dispositif documenté de prévention, de signalement et d&apos;orientation.
          </p>
          <div className="ethics-grid">
            <div className="ethics-cell">
              <div className="l">01 · Mécanisme de signalement</div>
              <h4>Confidentialité <em>garantie</em></h4>
              <p>
                Tout bénéficiaire, collaborateur ou partenaire peut signaler un comportement contraire au Code de conduite. Formulaire confidentiel + voies de référence interne PEAS.
              </p>
              <Link href="/contact">Déposer un signalement <i className="ph ph-arrow-up-right"></i></Link>
            </div>
            <div className="ethics-cell">
              <div className="l">02 · Audit comptable annuel</div>
              <h4>États financiers <em>visés</em></h4>
              <p>
                Cabinet <strong>Atrio Consultance</strong> (BP 6118 N&apos;Djamena). Dépôt au système OHADA SYSCOHADA chaque année. Exercices 2021 à 2024 communiqués aux bailleurs et partenaires sur demande.
              </p>
              <Link href="/contact">Demander l&apos;accès aux états financiers <i className="ph ph-arrow-up-right"></i></Link>
            </div>
            <div className="ethics-cell">
              <div className="l">03 · Tolérance zéro EAS / VBG</div>
              <h4>Politique <em>publique</em></h4>
              <p>
                Code de conduite individuel signé par chaque agent, plan de formation PEAS, procédures de recrutement sécurisé, voies d&apos;orientation des survivantes.
              </p>
              <Link href="/contact">Nous écrire pour en savoir plus <i className="ph ph-arrow-up-right"></i></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
