import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Projet {
  id: string;
  ref: string;
  zone: string;
  domaine: string;
  titre: string;
  emTitre?: string;
  titreAfterEm?: string;
  desc: string;
  pct: number;
  bailleurs: Array<{ tone: "pnud" | "ue" | "cf" | "uni" | "fonds"; label: string }>;
  team: Array<{ initials: string; tone: "terracotta" | "ink" | "info" | "success" | "mineral" }>;
  deadline: string;
  urgent?: boolean;
  fini?: boolean;
  montage?: boolean;
  progressLabel?: string;
}

const PROJETS: Projet[] = [
  {
    id: "PRJ-2026-08", ref: "PRJ-2026-08", zone: "Mongo, Guéra", domaine: "Urgence",
    titre: "Réponse aux ", emTitre: "inondations", titreAfterEm: " dans le bassin du Batha.",
    desc: "Distribution de kits hygiène, abris d'urgence et réhabilitation de 6 forages affectés. Coordination avec la cellule OCHA Tchad et les autorités du Batha.",
    pct: 62, bailleurs: [{ tone: "ue", label: "UE/ECHO" }, { tone: "pnud", label: "PNUD" }],
    team: [{ initials: "AS", tone: "terracotta" }, { initials: "MM", tone: "ink" }, { initials: "FH", tone: "success" }],
    deadline: "Échéance dans 18j", urgent: true,
  },
  {
    id: "PRJ-2025-14", ref: "PRJ-2025-14", zone: "N'Djaména", domaine: "Jeunesse",
    titre: "Formation ", emTitre: "professionnelle", titreAfterEm: " de 240 jeunes vulnérables.",
    desc: "Cycle de 9 mois en couture, mécanique, maraîchage et boulangerie pour des jeunes déscolarisés des arrondissements 7, 8 et 9. Stage en entreprise et kit d'installation à la sortie.",
    pct: 78, bailleurs: [{ tone: "pnud", label: "PNUD" }, { tone: "cf", label: "Coop. Fr." }],
    team: [{ initials: "MM", tone: "ink" }, { initials: "RD", tone: "info" }, { initials: "AB", tone: "terracotta" }],
    deadline: "Clôture · 30 sept.",
  },
  {
    id: "PRJ-2025-09", ref: "PRJ-2025-09", zone: "Guéra", domaine: "Genre",
    titre: "Lutte contre les ", emTitre: "VBG", titreAfterEm: " en milieu rural.",
    desc: "Sensibilisation communautaire dans 14 villages, formation de 32 paralégaux et appui psycho-social aux survivantes. Partenariat avec les autorités traditionnelles et les ATPC de la province.",
    pct: 54, bailleurs: [{ tone: "ue", label: "UE" }],
    team: [{ initials: "FH", tone: "terracotta" }, { initials: "+3", tone: "mineral" }],
    deadline: "Clôture · 14 nov.",
  },
  {
    id: "PRJ-2024-11", ref: "PRJ-2024-11", zone: "Mongo, Guéra", domaine: "Femmes",
    titre: "Autonomisation économique de ", emTitre: "180 femmes.",
    desc: "Formation à l'entreprenariat, mise en place de 12 groupements d'épargne villageois (AVEC) et accompagnement à la transformation des produits agricoles locaux (sésame, arachide, karité).",
    pct: 82, bailleurs: [{ tone: "pnud", label: "PNUD" }],
    team: [{ initials: "FH", tone: "terracotta" }, { initials: "AB", tone: "success" }],
    deadline: "Clôture · 12 juil.",
  },
  {
    id: "PRJ-2025-04", ref: "PRJ-2025-04", zone: "N'Djaména", domaine: "Éducation",
    titre: "Soutien ", emTitre: "scolaire", titreAfterEm: " aux enfants vulnérables.",
    desc: "Cours de remédiation, fournitures et bourses pour 420 élèves du primaire dans 6 quartiers défavorisés. Collaboration avec 4 écoles publiques partenaires.",
    pct: 71, bailleurs: [{ tone: "cf", label: "Coop. Fr." }, { tone: "fonds", label: "Fonds propres" }],
    team: [{ initials: "RD", tone: "info" }, { initials: "+2", tone: "ink" }],
    deadline: "Année scolaire",
  },
  {
    id: "PRJ-2025-12", ref: "PRJ-2025-12", zone: "Mongo, Guéra", domaine: "Eau",
    titre: "Eau, hygiène et ", emTitre: "assainissement", titreAfterEm: " en zone rurale.",
    desc: "Réhabilitation de 8 forages communautaires, construction de 24 latrines familiales et formation de 14 comités de gestion. Volet sensibilisation à l'hygiène menstruelle dans 3 collèges.",
    pct: 38, bailleurs: [{ tone: "cf", label: "Coop. Fr." }],
    team: [{ initials: "MM", tone: "ink" }, { initials: "DH", tone: "success" }],
    deadline: "Clôture · 28 fév. 2027",
  },
  {
    id: "PRJ-2026-02", ref: "PRJ-2026-02", zone: "N'Djaména", domaine: "Santé",
    titre: "Soins de santé ", emTitre: "primaires", titreAfterEm: " pour familles précaires.",
    desc: "Consultations gratuites, dépistage paludisme et nutrition dans 3 centres de santé urbains partenaires. 4 800 bénéficiaires attendus sur l'année.",
    pct: 22, bailleurs: [{ tone: "pnud", label: "PNUD" }, { tone: "fonds", label: "Fonds propres" }],
    team: [{ initials: "RD", tone: "info" }, { initials: "AS", tone: "terracotta" }],
    deadline: "Clôture · 31 déc.",
  },
  {
    id: "PRJ-2024-06", ref: "PRJ-2024-06", zone: "Guéra", domaine: "Cohésion",
    titre: "PRECOM — Renforcement ", emTitre: "communautaire.",
    desc: "Programme triennal de cohésion sociale autour de 3 communes du Guéra. Comités locaux de paix, dialogue intercommunautaire éleveurs-agriculteurs, médiation des conflits fonciers.",
    pct: 66, bailleurs: [{ tone: "ue", label: "UE" }],
    team: [{ initials: "FH", tone: "terracotta" }, { initials: "+4", tone: "mineral" }],
    deadline: "Clôture · 30 juin 2027",
  },
  {
    id: "PRJ-2023-03", ref: "PRJ-2023-03", zone: "N'Djaména", domaine: "Achevé",
    titre: "Réinsertion de ", emTitre: "96 jeunes", titreAfterEm: " déscolarisés.",
    desc: "Pilote sur 18 mois — formation, accompagnement individuel et amorçage. 78% des bénéficiaires en activité 6 mois après la sortie. Rapport final livré.",
    pct: 100, bailleurs: [{ tone: "pnud", label: "PNUD" }],
    team: [{ initials: "MM", tone: "ink" }],
    deadline: "Achevé · 14 fév. 2025", fini: true, progressLabel: "Clôturé",
  },
  {
    id: "PRJ-2022-08", ref: "PRJ-2022-08", zone: "Mongo, Guéra", domaine: "Achevé",
    titre: "Microfinance ", emTitre: "solidaire", titreAfterEm: " pour 11 groupements.",
    desc: "Mise en place de caisses villageoises, formation à la gestion et suivi sur 24 mois. Taux de remboursement final : 91%. Étude d'impact externe livrée à la Coop. Française.",
    pct: 100, bailleurs: [{ tone: "cf", label: "Coop. Fr." }],
    team: [{ initials: "AB", tone: "success" }],
    deadline: "Achevé · 30 sept. 2024", fini: true, progressLabel: "Clôturé",
  },
  {
    id: "PRJ-2026-12", ref: "PRJ-2026-12 · MONTAGE", zone: "Guéra", domaine: "",
    titre: "Scolarisation ", emTitre: "des filles", titreAfterEm: " en milieu rural.",
    desc: "Note conceptuelle déposée le 22 mars 2026 auprès de la Coopération Française. Réponse attendue mi-juin. Projet pilote sur 3 villages cibles, 380 filles.",
    pct: 25, bailleurs: [{ tone: "cf", label: "Coop. Fr. — pressenti" }],
    team: [], deadline: "Décision juin 2026", montage: true,
    progressLabel: "Note conceptuelle déposée",
  },
  {
    id: "PRJ-2026-15", ref: "PRJ-2026-15 · MONTAGE", zone: "N'Djaména", domaine: "",
    titre: "Plaidoyer ", emTitre: "citoyenneté", titreAfterEm: " et participation des jeunes.",
    desc: "Concept en co-construction avec 4 OSC partenaires de N'Djaména. Recherche de bailleur en cours — pistes UE Délégation Tchad et fondations privées.",
    pct: 10, bailleurs: [], team: [], deadline: "Bailleur à identifier", montage: true,
    progressLabel: "Recherche bailleur",
  },
];

export default async function ProjetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actifs = PROJETS.filter((p) => !p.fini && !p.montage).length;
  const montage = PROJETS.filter((p) => p.montage).length;
  const acheves = PROJETS.filter((p) => p.fini).length;

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">{PROJETS.length} projets · 3 zones d&apos;intervention</div>
          <h1 className="pg-title">Le portefeuille <em>de programmes.</em></h1>
          <p className="pg-sub">
            L&apos;ensemble des projets portés par CHADIA depuis 2018 dans les régions de
            N&apos;Djaména, du Guéra et du Batha (Mongo). Filtrage par zone, partenaire
            financier et statut d&apos;avancement.
          </p>
        </div>
        <div className="pg-actions">
          <button className="btn btn--ghost btn--sm">
            <i className="ph ph-export"></i> Exporter
          </button>
          <Link href="/projets/nouveau" className="btn btn--accent btn--sm">
            <i className="ph ph-plus"></i> Nouveau projet
          </Link>
        </div>
      </header>

      <div className="pj-head-extra">
        <div className="pj-stat">
          <div className="l">Projets actifs</div>
          <div className="v">{actifs}</div>
          <div className="d">+2 ce trimestre</div>
        </div>
        <div className="pj-stat">
          <div className="l">En montage</div>
          <div className="v">{montage}</div>
          <div className="d">Recherche de financement</div>
        </div>
        <div className="pj-stat">
          <div className="l">Achevés</div>
          <div className="v">{acheves}</div>
          <div className="d">Rapports déposés</div>
        </div>
        <div className="pj-stat">
          <div className="l">Volume sous gestion</div>
          <div className="v">187 <em>M FCFA</em></div>
          <div className="d">Engagements 2026</div>
        </div>
        <div className="pj-stat">
          <div className="l">Bénéficiaires touchés</div>
          <div className="v">12 <em>k+</em></div>
          <div className="d">Cumulé 2018–2026</div>
        </div>
      </div>

      <div className="pj-bar">
        <label className="search">
          <i className="ph ph-magnifying-glass"></i>
          <input type="text" placeholder="Rechercher un projet, une zone, un partenaire…" />
        </label>
        <button className="pill on">Tous <span className="ct">{PROJETS.length}</span></button>
        <button className="pill">Actifs <span className="ct">{actifs}</span></button>
        <button className="pill">En montage <span className="ct">{montage}</span></button>
        <button className="pill">Achevés <span className="ct">{acheves}</span></button>
        <span className="sep"></span>
        <button className="pill"><i className="ph ph-map-pin"></i> Toutes zones <i className="ph ph-caret-down"></i></button>
        <button className="pill"><i className="ph ph-bank"></i> Tous partenaires <i className="ph ph-caret-down"></i></button>
      </div>

      <div className="pj-grid">
        {PROJETS.map((p) => {
          const cls = ["pj-card"];
          if (p.urgent) cls.push("urgent");
          if (p.fini) cls.push("fini");
          if (p.montage) cls.push("montage");
          const barCls = p.fini ? "bar s" : p.pct < 40 ? "bar w" : "bar";
          return (
            <Link key={p.id} href={`/projets/${p.id}`} className={cls.join(" ")}>
              <div className="ref">
                {p.ref}
                {p.zone && (
                  <>
                    <span className="dot">·</span> <span className="zone">{p.zone}</span>
                  </>
                )}
                {p.domaine && (
                  <>
                    <span className="dot">·</span> <span>{p.domaine}</span>
                  </>
                )}
              </div>
              <h3>
                {p.titre}
                {p.emTitre && <em>{p.emTitre}</em>}
                {p.titreAfterEm}
              </h3>
              <p className="desc">{p.desc}</p>
              <div className="pj-progress">
                <div className="row">
                  <span className="l">{p.progressLabel ?? "Avancement"}</span>
                  <span className="v">
                    {p.montage && p.progressLabel
                      ? p.progressLabel
                      : <>{p.pct}<em>%</em></>}
                  </span>
                </div>
                <div className={barCls}><span style={{ width: `${p.pct}%` }}></span></div>
              </div>
              <div className="pj-foot">
                {p.bailleurs.map((b) => (
                  <span key={b.label} className={`donor ${b.tone}`}>{b.label}</span>
                ))}
                {p.team.length > 0 && (
                  <div className="team">
                    {p.team.map((t, i) => (
                      <span key={i} className={`avatar avatar--xs avatar--${t.tone}`}>{t.initials}</span>
                    ))}
                  </div>
                )}
                <span className={`deadline ${p.urgent ? "urgent" : ""}`} style={p.bailleurs.length === 0 ? { color: "var(--color-mineral)" } : undefined}>
                  {p.urgent && <i className="ph ph-warning"></i>} {p.deadline}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ textAlign: "center", padding: "32px 0 0" }}>
        <button className="btn btn--ghost">
          Voir les 3 autres projets <i className="ph ph-caret-down"></i>
        </button>
      </div>
    </div>
  );
}
