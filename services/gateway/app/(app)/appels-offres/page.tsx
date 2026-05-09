import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: "badge--draft",
  PUBLIE: "badge--published",
  EN_COURS: "badge--published",
  CLOTURE: "badge--closed",
  EN_EVALUATION: "badge--review",
  ATTRIBUE: "badge--awarded",
  ANNULE: "badge--canceled",
  ARCHIVE: "badge--closed",
};
const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "Évaluation", ATTRIBUE: "Attribué",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

const PIPELINE: { key: string; num: string; label: string; klass: string; help?: string }[] = [
  { key: "BROUILLON",    num: "01", label: "Brouillons",   klass: "" },
  { key: "PUBLIE",       num: "02", label: "Publiés",      klass: "s-published" },
  { key: "EN_COURS",     num: "03", label: "En cours",     klass: "s-published" },
  { key: "EN_EVALUATION",num: "04", label: "Évaluation",   klass: "s-review" },
  { key: "ATTRIBUE",     num: "05", label: "Attribués",    klass: "s-awarded" },
  { key: "CLOTURE",      num: "06", label: "Clôturés",     klass: "" },
  { key: "ANNULE",       num: "07", label: "Annulés",      klass: "s-canceled" },
];

interface AppelOffre {
  id: string;
  reference: string;
  titre: string;
  statut: string;
  categorie: string;
  secteur?: string | null;
  budgetEstime?: number | null;
  devise?: string | null;
  dateLimiteDepot: string;
  lieuExecution?: string | null;
  bailleur: { nom: string; sigle: string };
  _count: { soumissions: number };
}

interface Analytics {
  byStatut?: { statut: string; _count: { id: number } }[];
}

function fundersClass(sigle: string): string {
  const s = (sigle || "").toUpperCase();
  if (s === "UE") return "ue";
  if (s === "BM" || s === "BAD") return "bm";
  if (s === "AFD") return "afd";
  if (["UNICEF", "PNUD", "PAM", "FAO"].includes(s)) return "un";
  if (s === "USAID") return "usaid";
  if (s === "GIZ") return "ddc";
  return "in";
}

function fundersLabel(sigle: string): string {
  const map: Record<string, string> = {
    UE: "UE",
    BM: "BM",
    BAD: "BAD",
    AFD: "AFD",
    UNICEF: "UN",
    PNUD: "UN",
    PAM: "UN",
    FAO: "UN",
    USAID: "US",
    GIZ: "DDC",
  };
  return map[(sigle || "").toUpperCase()] ?? "IN";
}

function categorieShort(cat: string): string {
  const map: Record<string, string> = {
    TRAVAUX: "Travaux", FOURNITURES: "Fournitures",
    SERVICES: "Services", MIXTE: "Mixte",
  };
  return map[cat] ?? cat;
}

function progressPct(statut: string): { pct: number; klass: "" | "terra" | "success" } {
  switch (statut) {
    case "BROUILLON": return { pct: 22, klass: "" };
    case "PUBLIE": return { pct: 38, klass: "success" };
    case "EN_COURS": return { pct: 66, klass: "success" };
    case "EN_EVALUATION": return { pct: 78, klass: "terra" };
    case "ATTRIBUE": return { pct: 100, klass: "success" };
    case "CLOTURE": return { pct: 100, klass: "success" };
    case "ANNULE": return { pct: 100, klass: "" };
    case "ARCHIVE": return { pct: 100, klass: "" };
    default: return { pct: 12, klass: "" };
  }
}

function fmtMoney(n: number | null | undefined): { val: string; unit: string } {
  if (n == null) return { val: "—", unit: "" };
  if (n >= 1_000_000_000) return { val: `${(n / 1_000_000_000).toFixed(1)} Md`, unit: "FCFA" };
  if (n >= 1_000_000) return { val: String(Math.round(n / 1_000_000)) + " M", unit: "FCFA" };
  if (n >= 1_000) return { val: String(Math.round(n / 1_000)) + " k", unit: "FCFA" };
  return { val: String(n), unit: "FCFA" };
}

function deadlineDisplay(dateIso: string, statut: string): { strong: string; small: string; urgent: boolean } {
  if (statut === "ATTRIBUE") return { strong: "contrat", small: "signé", urgent: false };
  if (statut === "CLOTURE" || statut === "ARCHIVE") return { strong: "archivable", small: "dossier complet", urgent: false };
  if (statut === "ANNULE") return { strong: "—", small: "annulé", urgent: false };
  if (statut === "BROUILLON") return { strong: "—", small: "non publié", urgent: false };

  const d = new Date(dateIso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = diffMs / 36e5;
  const diffJ = diffMs / 864e5;
  if (diffH < 0) return { strong: "dépassée", small: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), urgent: true };
  if (diffH < 24) return { strong: `${Math.round(diffH)} h`, small: `clôture ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, urgent: true };
  if (diffJ < 7) return { strong: d.toLocaleDateString("fr-FR", { weekday: "long" }), small: `${Math.round(diffJ)} jours`, urgent: diffJ < 3 };
  return {
    strong: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    small: `${Math.round(diffJ)} jours`,
    urgent: false,
  };
}

const TEAM_INITIALS = ["FN", "MD", "AS", "HO", "JN", "SK", "BL", "OT"] as const;
const TEAM_VARIANTS = ["avatar--terracotta", "avatar--info", "avatar--ink", "avatar--success", "avatar--mineral"] as const;
function fakeTeamFromId(id: string, n = 2): { initials: string; klass: string }[] {
  const seed = id.charCodeAt(id.length - 1) + id.charCodeAt(0);
  return Array.from({ length: n }, (_, i) => ({
    initials: TEAM_INITIALS[(seed + i) % TEAM_INITIALS.length],
    klass: TEAM_VARIANTS[(seed + i) % TEAM_VARIANTS.length],
  }));
}

export default async function AppelsOffresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; categorie?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  const { q, statut, categorie, page: pageStr } = await searchParams;
  const params: Record<string, string> = { limit: "20" };
  if (q) params.q = q;
  if (statut) params.statut = statut;
  if (categorie) params.categorie = categorie;

  let appelsOffres: AppelOffre[] = [];
  let total = 0;
  let analytics: Analytics = {};
  let errorMsg: string | null = null;
  try {
    const [aoData, anData] = await Promise.all([
      TenderAPI.listAppelsOffres(params),
      token ? TenderAPI.getAnalytics(token) : Promise.resolve({} as Analytics),
    ]);
    appelsOffres = aoData.appelsOffres ?? [];
    total = aoData.total ?? 0;
    analytics = anData;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const counts: Record<string, number> = {};
  (analytics.byStatut ?? []).forEach((s) => {
    counts[s.statut] = s._count.id;
  });

  const buildHref = (newStatut?: string) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (categorie) u.set("categorie", categorie);
    if (newStatut) u.set("statut", newStatut);
    const s = u.toString();
    return s ? `/appels-offres?${s}` : "/appels-offres";
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Cycle des marchés · Vue {session.user.role === "DIRECTEUR" ? "Direction" : "Membre"}</div>
          <h1 className="page-title">Appels d&apos;<em>offres</em></h1>
          <p className="page-subtitle">
            <span className="tabular-nums">{total}</span> dossier{total > 1 ? "s" : ""} dans le portefeuille. Le pipeline ci-dessous reflète les statuts règlementaires du manuel des marchés publics tchadien.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/appels-offres/nouveau" className="btn btn--accent">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Nouvel appel d&apos;offres
          </Link>
        </div>
      </div>

      <div className="pipeline">
        <Link href={buildHref()} className={`pipe-step ${!statut ? "active" : ""}`}>
          <div className="step-meta"><span className="dot"></span>00 · Tous</div>
          <div className="step-name tabular-nums">{total}</div>
          <div className="step-help">portefeuille</div>
        </Link>
        {PIPELINE.slice(0, 6).map((p) => (
          <Link
            key={p.key}
            href={buildHref(p.key)}
            className={`pipe-step ${p.klass} ${statut === p.key ? "active" : ""}`}
          >
            <div className="step-meta"><span className="dot"></span>{p.num} · {p.label}</div>
            <div className="step-name tabular-nums">{counts[p.key] ?? 0}</div>
            <div className="step-help">
              {p.key === "BROUILLON" && "à compléter"}
              {p.key === "PUBLIE" && "ouverts"}
              {p.key === "EN_COURS" && "en collecte"}
              {p.key === "EN_EVALUATION" && "à juger"}
              {p.key === "ATTRIBUE" && "contrats"}
              {p.key === "CLOTURE" && "archivables"}
            </div>
          </Link>
        ))}
      </div>

      <form method="get" className="filterbar">
        <label className="search">
          <i className="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input name="q" defaultValue={q ?? ""} placeholder="Filtrer par titre, référence, fournisseur, bailleur…" />
          <span className="kbd">/</span>
        </label>
        {statut && <input type="hidden" name="statut" value={statut} />}
        <select name="categorie" className="fb-btn" defaultValue={categorie ?? ""} style={{ appearance: "none", paddingRight: 24 }}>
          <option value="">Toutes catégories</option>
          <option value="TRAVAUX">Travaux</option>
          <option value="FOURNITURES">Fournitures</option>
          <option value="SERVICES">Services</option>
          <option value="MIXTE">Mixte</option>
        </select>
        <button type="submit" className="fb-btn"><i className="ph ph-funnel" aria-hidden="true"></i> Filtrer</button>
        <Link href="/appels-offres" className="fb-btn"><i className="ph ph-arrow-counter-clockwise" aria-hidden="true"></i> Réinitialiser</Link>
        <button type="button" className="fb-btn"><i className="ph ph-download-simple" aria-hidden="true"></i> Exporter</button>
        <button type="button" className="fb-btn"><i className="ph ph-kanban" aria-hidden="true"></i> Kanban</button>
      </form>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      {appelsOffres.length === 0 ? (
        <div className="empty">
          <div className="ic"><i className="ph ph-folder-open" aria-hidden="true"></i></div>
          <h3 className="t">Aucun <em>appel d&apos;offre</em> trouvé</h3>
          <p className="s">{q || statut || categorie ? "Aucun résultat avec ces filtres." : "Lancez votre premier appel d'offre pour démarrer."}</p>
          <Link href="/appels-offres/nouveau" className="btn btn--accent">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Nouvel appel d&apos;offres
          </Link>
        </div>
      ) : (
        <table className="ao-table">
          <thead>
            <tr>
              <th style={{ width: 108 }}>Réf. <i className="ph ph-arrow-down" aria-hidden="true"></i></th>
              <th>Intitulé du marché</th>
              <th style={{ width: 200 }}>Bailleur · secteur</th>
              <th style={{ width: 130 }}>Statut</th>
              <th style={{ width: 130 }}>Avancement</th>
              <th style={{ width: 130 }}>Échéance <i className="ph ph-arrow-up" aria-hidden="true"></i></th>
              <th style={{ width: 110, textAlign: "right" }}>Montant</th>
              <th style={{ width: 100 }}>Équipe</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {appelsOffres.map((ao) => {
              const fc = fundersClass(ao.bailleur?.sigle ?? "");
              const fl = fundersLabel(ao.bailleur?.sigle ?? "");
              const dl = deadlineDisplay(ao.dateLimiteDepot, ao.statut);
              const progress = progressPct(ao.statut);
              const money = fmtMoney(ao.budgetEstime ?? null);
              const team = fakeTeamFromId(ao.id, 2);
              return (
                <tr
                  key={ao.id}
                  onClick={undefined}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <Link href={`/appels-offres/${ao.id}`} className="ref" style={{ textDecoration: "none" }}>
                      {ao.reference}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/appels-offres/${ao.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="title-cell">
                        <span className="t">{ao.titre}</span>
                        <span className="m">
                          {ao.lieuExecution ? (
                            <span><i className="ph ph-map-pin" aria-hidden="true" style={{ fontSize: 12 }}></i> {ao.lieuExecution}</span>
                          ) : (
                            <span><i className="ph ph-buildings" aria-hidden="true" style={{ fontSize: 12 }}></i> {categorieShort(ao.categorie)}</span>
                          )}
                          {ao.secteur && (<><span className="sep">·</span><span>{ao.secteur}</span></>)}
                          <span className="sep">·</span>
                          <span><span className="tabular-nums">{ao._count?.soumissions ?? 0}</span> soumission{(ao._count?.soumissions ?? 0) > 1 ? "s" : ""} reçue{(ao._count?.soumissions ?? 0) > 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <div className="funder">
                      <span className={`fmark ${fc}`}>{fl}</span>
                      <span><strong>{ao.bailleur?.sigle ?? "—"}</strong><small>{categorieShort(ao.categorie)}{ao.secteur ? ` · ${ao.secteur}` : ""}</small></span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[ao.statut] ?? "badge--draft"}`}>
                      <span className="dot"></span>
                      {STATUT_LABEL[ao.statut] ?? ao.statut}
                    </span>
                  </td>
                  <td>
                    <div className="progress-row">
                      <div className="track"><div className={`fill ${progress.klass}`} style={{ width: `${progress.pct}%` }} /></div>
                      <span className="pct tabular-nums">{progress.pct}%</span>
                    </div>
                  </td>
                  <td>
                    <div className={`deadline ${dl.urgent ? "urgent" : ""}`}>
                      <strong>{dl.strong}</strong>
                      <small>{dl.small}</small>
                    </div>
                  </td>
                  <td className="num">
                    <strong>{money.val}</strong>
                    {money.unit && <small>{money.unit}</small>}
                  </td>
                  <td>
                    <div className="avatar-stack">
                      {team.map((t, i) => (
                        <span key={i} className={`avatar avatar--xs ${t.klass}`}>{t.initials}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <i className="ph ph-dots-three-vertical" aria-hidden="true" style={{ color: "var(--color-stone)" }}></i>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {appelsOffres.length > 0 && (
        <div className="bottombar">
          <span>
            Affichage de <strong style={{ color: "var(--color-ink)" }}>
              <span className="tabular-nums">{appelsOffres.length}</span> sur <span className="tabular-nums">{total}</span>
            </strong> appels d&apos;offres · trié par échéance ascendante
          </span>
          <div className="pages">
            <button className="page-btn" type="button"><i className="ph ph-caret-left" aria-hidden="true"></i></button>
            <button className="page-btn active" type="button">1</button>
            {total > 20 && <button className="page-btn" type="button">2</button>}
            <button className="page-btn" type="button"><i className="ph ph-caret-right" aria-hidden="true"></i></button>
          </div>
        </div>
      )}
    </>
  );
}
