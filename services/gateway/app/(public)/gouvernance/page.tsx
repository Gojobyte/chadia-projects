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

const TEAM_CA = [
  {
    initiales: "KB",
    nm: "Khadidja Bouchoura Youssouf",
    role: "Conseil d'Administration",
    titre: "Présidente du CA",
    em: "Élue 15 oct. 2022",
    bio: "Préside le Conseil d'administration de l'ONG CHADIA. Veille à la conformité de l'organisation aux statuts et à la cohérence des engagements stratégiques avec la mission de développement du Tchad.",
    meta: "Conseil d'administration",
  },
  {
    initiales: "AM",
    nm: "Amine Moustapha Saleh",
    role: "Conseil d'Administration",
    titre: "Vice-Président du CA",
    em: "Élu 15 oct. 2022",
    bio: "Vice-Président du Conseil d'administration. Seconde la Présidente et supervise l'application des décisions du Conseil au sein du Bureau Exécutif.",
    meta: "Conseil d'administration",
  },
  {
    initiales: "SK",
    nm: "Salah Khastalani",
    role: "Conseil d'Administration",
    titre: "Commissaire au Compte",
    em: "Contrôle indépendant",
    bio: "Commissaire au Compte de l'ONG. Examine les états financiers et certifie la régularité et la sincérité des comptes annuels présentés à l'Assemblée Générale.",
    meta: "Contrôle indépendant",
  },
];

const TEAM_BE = [
  {
    initiales: "TS",
    nm: "Tidjani SALAH",
    role: "Bureau Exécutif",
    titre: "Directeur Général",
    em: "Coordinateur",
    bio: "Coordonne l'ensemble des opérations de l'ONG CHADIA. Représente l'organisation auprès des partenaires institutionnels (AUDA-NEPAD, ministères tchadiens) et du secteur privé.",
    meta: "Direction Générale · BP 6118 N'Djamena",
  },
  {
    initiales: "AI",
    nm: "Amine Idriss",
    role: "Bureau Exécutif",
    titre: "Responsable Communication",
    em: "Communication externe",
    bio: "Pilote la communication institutionnelle de l'ONG CHADIA, les relations avec la presse et le suivi des publications réglementaires.",
    meta: "Bureau Exécutif",
  },
  {
    initiales: "MH",
    nm: "Moustapha Hisseine Ahmat",
    role: "Bureau Exécutif",
    titre: "Trésorier",
    em: "Trésorerie & finances",
    bio: "Trésorier du Bureau Exécutif. Suit la trésorerie, valide les engagements bancaires et garantit la disponibilité des fonds pour les opérations courantes.",
    meta: "Bureau Exécutif",
  },
  {
    initiales: "BM",
    nm: "Brahim Mahamat ALI",
    role: "Bureau Exécutif",
    titre: "Secrétaire comptable",
    em: "Tenue comptable",
    bio: "Assure la tenue de la comptabilité quotidienne, l'archivage des pièces justificatives et la préparation des états financiers avant visa du cabinet expert-comptable.",
    meta: "Bureau Exécutif",
  },
];

const DOCS = [
  { ic: "ph-scroll", nm: "Manuel de procédures ", em: "CHADIA", sub: "Procédures opérationnelles internes · achats et marchés" },
  { ic: "ph-clipboard-text", nm: "Plan de Management ", em: "des Projets (PMP)", sub: "Cadre de gouvernance projet · cycle complet" },
  { ic: "ph-shield-check", nm: "Manuel PEAS ", em: "CHADIA", sub: "Prévention de l'Exploitation et des Abus Sexuels" },
  { ic: "ph-first-aid", nm: "Manuel sécurité, santé ", em: "et environnement", sub: "Normes SSE applicables sur les chantiers" },
  { ic: "ph-car-profile", nm: "Manuel ", em: "voyages et missions", sub: "Cadre pour les missions terrain et déplacements" },
  { ic: "ph-package", nm: "Procédure ", em: "gestion des biens", sub: "Inventaire, mouvements et amortissements" },
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

      <section className="team">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Conseil d&apos;Administration
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Trois membres <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>élus.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15 }}>
            Élus en Assemblée Générale du 15 octobre 2022. Le CA supervise les orientations stratégiques de l&apos;association.
          </p>
          <div className="team-grid">
            {TEAM_CA.map((p) => (
              <div key={p.initiales} className="person">
                <div className="photo">
                  <span className="role-tag">{p.role}</span>
                  <i className="ph ph-user-circle"></i>
                </div>
                <div className="body">
                  <h4>{p.nm}<em>{p.titre} · {p.em}</em></h4>
                  <p className="bio">{p.bio}</p>
                  <div className="meta">{p.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="team" style={{ paddingTop: 0 }}>
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Bureau Exécutif
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            L&apos;équipe <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>opérationnelle.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15 }}>
            Équipe désignée par le Conseil d&apos;administration, en charge de l&apos;exécution des programmes et de la gestion quotidienne.
          </p>
          <div className="team-grid">
            {TEAM_BE.map((p) => (
              <div key={p.initiales} className="person">
                <div className="photo">
                  <span className="role-tag">{p.role}</span>
                  <i className="ph ph-user-circle"></i>
                </div>
                <div className="body">
                  <h4>{p.nm}<em>{p.titre} · {p.em}</em></h4>
                  <p className="bio">{p.bio}</p>
                  <div className="meta">{p.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="docs">
        <div className="psection-wrap">
          <div className="section-eyebrow">
            <span className="rule"></span> Cadre normatif interne
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Les textes qui <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>nous obligent.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15 }}>
            Six manuels et procédures officiels qui encadrent toutes nos opérations — du recrutement à la passation de marchés, en passant par la sauvegarde des bénéficiaires.
          </p>
          <div className="docs-grid">
            {DOCS.map((d) => (
              <a key={d.nm} href="#" className="doc-card">
                <span className="ic"><i className={`ph ${d.ic}`}></i></span>
                <span className="nm">
                  {d.nm}<em>{d.em}</em>
                  <small>{d.sub}</small>
                </span>
                <i className="ph ph-arrow-up-right arrow"></i>
              </a>
            ))}
          </div>
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
                Cabinet <strong>Atrio Consultance</strong> (BP 6118 N&apos;Djamena). Dépôt au système OHADA SYSCOHADA chaque année. Exercices 2021, 2022, 2023 et 2024 disponibles.
              </p>
              <Link href="/rapports">Consulter les rapports <i className="ph ph-arrow-up-right"></i></Link>
            </div>
            <div className="ethics-cell">
              <div className="l">03 · Tolérance zéro EAS / VBG</div>
              <h4>Politique <em>publique</em></h4>
              <p>
                Code de conduite individuel signé par chaque agent, plan de formation PEAS, procédures de recrutement sécurisé, voies d&apos;orientation des survivantes.
              </p>
              <Link href="#">Voir la politique de sauvegarde <i className="ph ph-arrow-up-right"></i></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
