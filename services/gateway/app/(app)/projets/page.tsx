import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Projet {
  id: string;
  reference: string;
  titre: string;
  description?: string | null;
  zone?: string | null;
  domaine: string;
  statut: "MONTAGE" | "ACTIF" | "ACHEVE" | "SUSPENDU" | "ANNULE";
  urgent: boolean;
  bailleurs: string[];
  team: string[];
  echeance?: string | null;
  avancement: number;
  etapeLabel?: string | null;
  budgetEstime?: number | null;
}

const DOMAINE_LABEL: Record<string, string> = {
  URGENCE: "Urgence",
  JEUNESSE: "Jeunesse",
  GENRE: "Genre",
  FEMMES: "Femmes",
  EDUCATION: "Éducation",
  EAU: "Eau",
  SANTE: "Santé",
  COHESION: "Cohésion",
  FORMATION: "Formation",
  AGRICULTURE: "Agriculture",
  AUTRE: "Autre",
};

function donorTone(b: string): "pnud" | "ue" | "cf" | "uni" | "fonds" {
  const k = b.toUpperCase();
  if (k.startsWith("PNUD") || k.startsWith("UN")) return "pnud";
  if (k.startsWith("UE") || k.includes("EUROP")) return "ue";
  if (k.startsWith("CF") || k.includes("FRAN")) return "cf";
  if (k.includes("ONU") || k.includes("UNICEF")) return "uni";
  return "fonds";
}

function teamTone(initials: string): "terracotta" | "ink" | "info" | "success" | "mineral" {
  const t = ["terracotta", "ink", "info", "success", "mineral"] as const;
  let h = 0;
  for (const c of initials) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return t[h % t.length];
}

export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; domaine?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  const { statut, domaine, q } = await searchParams;
  const params: Record<string, string> = {};
  if (statut) params.statut = statut;
  if (domaine) params.domaine = domaine;
  if (q) params.q = q;

  let projets: Projet[] = [];
  let total = 0;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listProjets(params, token);
    projets = data.projets ?? [];
    total = data.total ?? projets.length;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const actifs = projets.filter((p) => p.statut === "ACTIF").length;
  const montage = projets.filter((p) => p.statut === "MONTAGE").length;
  const acheves = projets.filter((p) => p.statut === "ACHEVE").length;
  const volume = projets.reduce((s, p) => s + (p.budgetEstime ?? 0), 0);

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">{total} projet{total > 1 ? "s" : ""} · 3 zones d&apos;intervention</div>
          <h1 className="pg-title">Le portefeuille <em>de programmes.</em></h1>
          <p className="pg-sub">
            L&apos;ensemble des projets portés par ONG CHADIA dans les régions de N&apos;Djaména, du Guéra et du Batha. Données chargées en temps réel depuis le service tender.
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

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      <div className="pj-head-extra">
        <div className="pj-stat">
          <div className="l">Projets actifs</div>
          <div className="v">{actifs}</div>
          <div className="d">en cours d&apos;exécution</div>
        </div>
        <div className="pj-stat">
          <div className="l">En montage</div>
          <div className="v">{montage}</div>
          <div className="d">recherche de financement</div>
        </div>
        <div className="pj-stat">
          <div className="l">Achevés</div>
          <div className="v">{acheves}</div>
          <div className="d">rapports déposés</div>
        </div>
        <div className="pj-stat">
          <div className="l">Volume sous gestion</div>
          <div className="v">
            {volume > 0 ? (
              <>{Math.round(volume / 1_000_000)} <em>M FCFA</em></>
            ) : "—"}
          </div>
          <div className="d">budgets cumulés</div>
        </div>
        <div className="pj-stat">
          <div className="l">Source</div>
          <div className="v">DB <em>live</em></div>
          <div className="d">Postgres · schéma tender</div>
        </div>
      </div>

      <form method="get" className="pj-bar">
        <label className="search">
          <i className="ph ph-magnifying-glass"></i>
          <input
            name="q"
            type="text"
            defaultValue={q ?? ""}
            placeholder="Rechercher un projet, une zone, un partenaire…"
          />
        </label>
        <Link href="/projets" className={`pill ${!statut ? "on" : ""}`}>
          Tous <span className="ct">{projets.length}</span>
        </Link>
        <Link href="/projets?statut=ACTIF" className={`pill ${statut === "ACTIF" ? "on" : ""}`}>
          Actifs <span className="ct">{actifs}</span>
        </Link>
        <Link href="/projets?statut=MONTAGE" className={`pill ${statut === "MONTAGE" ? "on" : ""}`}>
          En montage <span className="ct">{montage}</span>
        </Link>
        <Link href="/projets?statut=ACHEVE" className={`pill ${statut === "ACHEVE" ? "on" : ""}`}>
          Achevés <span className="ct">{acheves}</span>
        </Link>
        <span className="sep"></span>
        <select name="domaine" defaultValue={domaine ?? ""} style={{ height: 28, padding: "0 12px", fontSize: 12, border: "1px solid var(--color-line-strong)", borderRadius: 999, background: "transparent", color: "var(--color-sepia)" }}>
          <option value="">Tous domaines</option>
          {Object.entries(DOMAINE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="pill" style={{ background: "var(--color-ink)", color: "var(--color-page)", borderColor: "var(--color-ink)" }}>Filtrer</button>
      </form>

      {projets.length === 0 ? (
        <div className="empty" style={{ marginTop: 32 }}>
          <div className="ic"><i className="ph ph-folder-open"></i></div>
          <h3 className="t">Aucun <em>projet</em> trouvé</h3>
          <p className="s">{q || statut || domaine ? "Aucun projet ne correspond à ces filtres." : "Aucun projet n'a encore été créé."}</p>
          <Link href="/projets/nouveau" className="btn btn--primary">
            <i className="ph ph-plus"></i> Créer un projet
          </Link>
        </div>
      ) : (
        <div className="pj-grid">
          {projets.map((p) => {
            const cls = ["pj-card"];
            if (p.urgent) cls.push("urgent");
            if (p.statut === "ACHEVE") cls.push("fini");
            if (p.statut === "MONTAGE") cls.push("montage");
            const barCls = p.statut === "ACHEVE" ? "bar s" : p.avancement < 40 ? "bar w" : "bar";
            return (
              <Link key={p.id} href={`/projets/${p.id}`} className={cls.join(" ")}>
                <div className="ref">
                  {p.reference}
                  {p.zone && (
                    <>
                      <span className="dot">·</span> <span className="zone">{p.zone}</span>
                    </>
                  )}
                  {p.domaine && p.domaine !== "AUTRE" && (
                    <>
                      <span className="dot">·</span> <span>{DOMAINE_LABEL[p.domaine] ?? p.domaine}</span>
                    </>
                  )}
                </div>
                <h3>{p.titre}</h3>
                {p.description && <p className="desc">{p.description}</p>}
                <div className="pj-progress">
                  <div className="row">
                    <span className="l">{p.statut === "ACHEVE" ? "Clôturé" : p.statut === "MONTAGE" ? "Étape" : "Avancement"}</span>
                    <span className="v">
                      {p.statut === "MONTAGE" && p.etapeLabel
                        ? p.etapeLabel
                        : <>{p.avancement}<em>%</em></>}
                    </span>
                  </div>
                  <div className={barCls}><span style={{ width: `${p.avancement}%` }}></span></div>
                </div>
                <div className="pj-foot">
                  {p.bailleurs.map((b) => (
                    <span key={b} className={`donor ${donorTone(b)}`}>{b}</span>
                  ))}
                  {p.team.length > 0 && (
                    <div className="team">
                      {p.team.slice(0, 3).map((t, i) => (
                        <span key={i} className={`avatar avatar--xs avatar--${teamTone(t)}`}>{t}</span>
                      ))}
                      {p.team.length > 3 && (
                        <span className="avatar avatar--xs avatar--mineral">+{p.team.length - 3}</span>
                      )}
                    </div>
                  )}
                  {p.echeance && (
                    <span className={`deadline ${p.urgent ? "urgent" : ""}`}>
                      {p.urgent && <i className="ph ph-warning"></i>} {p.echeance}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
