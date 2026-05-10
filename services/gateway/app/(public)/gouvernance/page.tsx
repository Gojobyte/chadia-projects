import Link from "next/link";

export const metadata = {
  title: "Gouvernance · CHADIA",
  description:
    "Association tchadienne sans but lucratif. Assemblée générale, conseil d'administration, équipe exécutive — délibérations publiées sous 30 jours.",
};

const STRUCT = [
  {
    n: "01",
    nm: "Assemblée générale",
    sub: "Membres fondateurs, administrateurs, représentants salariés et bénéficiaires (148 voix).",
    role: "Souveraine",
    freq: "1× / an",
  },
  {
    n: "02",
    nm: "Conseil ",
    em: "d'administration",
    sub: "11 membres paritaires, 4 ans renouvelables. Valide le plan stratégique et les budgets pluriannuels.",
    role: "Stratégie & contrôle",
    freq: "4× / an",
  },
  {
    n: "03",
    nm: "Comité d'audit",
    sub: "3 administrateurs indépendants + commissaire aux comptes. Suit l'exécution budgétaire et les rapports d'audit externes.",
    role: "Audit & risque",
    freq: "Trimestriel",
  },
  {
    n: "04",
    nm: "Direction ",
    em: "exécutive",
    sub: "Directrice générale, Directrice des opérations, Directeur financier, Responsable conformité — exécution des décisions du CA.",
    role: "Exécutif",
    freq: "Hebdomadaire",
  },
  {
    n: "05",
    nm: "Comités villageois",
    sub: "À chaque projet : 5 à 12 représentants désignés par les communautés bénéficiaires, droit de véto sur la mise en œuvre.",
    role: "Co-construction",
    freq: "Continu",
  },
];

const TEAM = [
  { initiales: "AS", nm: "Aïcha Saleh", role: "Direction", titre: "Directrice générale", em: "co-fondatrice", bio: "Médecin de santé publique, ancienne responsable nutrition au Ministère de la Santé. Co-fonde CHADIA en 2014.", meta: "12 ans à CHADIA · médecin DESS Bordeaux" },
  { initiales: "MD", nm: "Mahamat Djibrine", role: "Programmes", titre: "Directeur des opérations", em: "5 bureaux régionaux", bio: "Ingénieur en eau et assainissement. Dirige le déploiement opérationnel et la coordination des cinq antennes.", meta: "8 ans à CHADIA · INPT Tchad" },
  { initiales: "FN", nm: "Fatimé Ngarmadji", role: "Finances", titre: "Directrice financière", em: "& conformité", bio: "Expert-comptable inscrite à l'OECCA-Tchad. Pilote la trésorerie pluriannuelle et la conformité bailleurs.", meta: "6 ans à CHADIA · OECCA-Tchad" },
  { initiales: "HO", nm: "Hassan Ouattara", role: "Bureau du Lac", titre: "Chef de bureau Bol", em: "antenne régionale", bio: "Géographe, ancien conseiller technique au PAM. Coordonne l'action terrain dans les 5 départements du Lac.", meta: "4 ans à CHADIA · UN-Lyon" },
  { initiales: "JT", nm: "Jeanne Tchèrémonté", role: "Conseil & audit", titre: "Présidente du CA", em: "indépendante", bio: "Magistrate à la retraite, ancienne présidente de la Cour des comptes du Tchad. Préside le conseil depuis 2020.", meta: "Indépendante · 6 ans au CA" },
  { initiales: "MK", nm: "Moussa Kemraou", role: "Comité d'audit", titre: "Président du comité d'audit", em: "administrateur indép.", bio: "Auditeur senior, ancien associé chez Deloitte Afrique Centrale. Garantit la rigueur des contrôles internes.", meta: "Indépendant · 4 ans au CA" },
];

const DOCS = [
  { ic: "ph-scroll", nm: "Statuts ", em: "de l'association", sub: "Récépissé n°187/MAT/SG/DAPSAJ · révisés le 12 juin 2024" },
  { ic: "ph-shield-check", nm: "Charte d'éthique ", em: "& code de conduite", sub: "Mise à jour janvier 2026 · 18 pages" },
  { ic: "ph-handshake", nm: "Politique passation ", em: "des marchés", sub: "Procédures simplifiée, ouverte, négociée — version 4.2" },
  { ic: "ph-detective", nm: "Politique anti-fraude ", em: "& corruption", sub: "Tolérance zéro · mécanisme de signalement anonyme" },
  { ic: "ph-leaf", nm: "Politique sauvegarde ", em: "environnementale", sub: "Évaluation systématique des projets · standards Banque Mondiale" },
  { ic: "ph-users-three", nm: "Politique sauvegarde ", em: "des bénéficiaires", sub: "PSEAH · prévention exploitation, abus, harcèlement" },
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
            L&apos;ONG CHADIA est une <strong>association tchadienne sans but lucratif</strong> régie par
            l&apos;ordonnance n°27/INT du 28 juillet 1962. Notre gouvernance s&apos;appuie sur une
            assemblée générale, un conseil d&apos;administration paritaire et une équipe exécutive
            dirigée par une Directrice Générale.{" "}
            <strong>Toutes nos délibérations stratégiques sont publiées dans les 30 jours.</strong>
          </p>
          <div className="phero-meta">
            <span>Statut <strong>Association tchadienne</strong></span>
            <span>Siège <strong>N&apos;Djamena</strong></span>
            <span>Récépissé <strong>n°187/MAT/SG/DAPSAJ</strong></span>
            <span>Reconnue d&apos;utilité publique <strong>2019</strong></span>
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
            <span className="rule"></span> Équipe & administration
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Six visages au <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>service</em> du Tchad.
          </h2>
          <p className="lede" style={{ fontSize: 15 }}>
            Notre direction et notre conseil d&apos;administration. Tous les profils complets sont
            accessibles dans le rapport annuel.
          </p>
          <div className="team-grid">
            {TEAM.map((p) => (
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
            <span className="rule"></span> Cadre normatif
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Les textes qui <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>nous obligent.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15 }}>Six documents publics que tout collaborateur, partenaire ou bailleur peut consulter à tout moment.</p>
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
            <span className="rule"></span> Éthique & redevabilité
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px,5vw,64px)", lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, margin: "0 0 8px", maxWidth: "22ch" }}>
            Trois engagements <em>fermes.</em>
          </h2>
          <p className="lede" style={{ fontSize: 15, color: "rgba(250,247,241,0.78)" }}>
            La transparence n&apos;est pas une option : c&apos;est notre raison d&apos;être.
          </p>
          <div className="ethics-grid">
            <div className="ethics-cell">
              <div className="l">01 · Mécanisme de plainte</div>
              <h4>Signaler en <em>confiance</em></h4>
              <p>
                Tout bénéficiaire, fournisseur ou collaborateur peut signaler un comportement
                contraire à notre charte. Confidentialité garantie, traitement sous 7 jours par
                un médiateur externe.
              </p>
              <Link href="/contact">Déposer un signalement <i className="ph ph-arrow-up-right"></i></Link>
            </div>
            <div className="ethics-cell">
              <div className="l">02 · Audit externe annuel</div>
              <h4>Compte rendu <em>public</em></h4>
              <p>
                Cabinet KPMG Afrique Centrale depuis 2019. Rapport publié intégralement sur cette
                plateforme. Aucune réserve sur les exercices 2022, 2023, 2024 et 2025.
              </p>
              <Link href="/rapports">Consulter les rapports <i className="ph ph-arrow-up-right"></i></Link>
            </div>
            <div className="ethics-cell">
              <div className="l">03 · Conflits d&apos;intérêts</div>
              <h4>Registre <em>ouvert</em></h4>
              <p>
                Tous les administrateurs et cadres déclarent leurs intérêts annuels. Le registre
                des déclarations et des récusations est public, accompagné des minutes de CA.
              </p>
              <Link href="#">Voir le registre <i className="ph ph-arrow-up-right"></i></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
