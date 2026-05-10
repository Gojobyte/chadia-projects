import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: "En attente", VERIFIE: "Vérifié", REJETE: "Rejeté",
  SUSPENDU: "Suspendu", BLACKLISTE: "Blacklisté",
};
const CATEGORIE_LABEL: Record<string, string> = {
  ENTREPRISE_INDIVIDUELLE: "Entreprise individuelle",
  SARL: "SARL", SA: "SA",
  ONG_NATIONALE: "ONG nationale",
  ONG_INTERNATIONALE: "ONG internationale",
  COOPERATIVE: "Coopérative",
  CONSORTIUM: "Consortium",
  AUTRE: "Autre",
};

interface Fournisseur {
  id: string;
  raisonSociale: string;
  sigle?: string | null;
  numeroRccm?: string | null;
  email: string;
  ville?: string | null;
  pays?: string | null;
  categorie: string;
  statut: string;
  domainesExpertise?: string[];
  anneesExperience?: number | null;
  chiffreAffaires?: number | null;
  _count: { soumissions: number; evaluations: number; documents: number };
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function logoTone(seed: string): "t1" | "t2" | "t3" | "t4" | "t5" {
  const tones = ["t1", "t2", "t3", "t4", "t5"] as const;
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

function trustScore(f: Fournisseur): number {
  let s = 30;
  if (f.statut === "VERIFIE") s += 30;
  if (f.statut === "EN_ATTENTE") s += 5;
  if (f.numeroRccm) s += 12;
  if ((f._count?.documents ?? 0) >= 3) s += 8;
  s += Math.min(15, (f._count?.soumissions ?? 0) * 2);
  s += Math.min(5, (f._count?.evaluations ?? 0));
  if (f.statut === "REJETE" || f.statut === "BLACKLISTE") s = Math.min(s, 35);
  if (f.statut === "SUSPENDU") s = Math.min(s, 50);
  return Math.max(0, Math.min(100, s));
}

function ringClass(score: number): string {
  if (score < 60) return "danger";
  if (score < 75) return "warn";
  return "";
}

function fmtMoneyM(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n / 1_000_000)} M FCFA`;
}

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; categorie?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  const { q, statut, categorie } = await searchParams;
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (statut) params.statut = statut;
  if (categorie) params.categorie = categorie;

  let fournisseurs: Fournisseur[] = [];
  let total = 0;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listFournisseurs(params, token);
    fournisseurs = data.fournisseurs ?? [];
    total = data.total ?? fournisseurs.length;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const verifies = fournisseurs.filter((f) => f.statut === "VERIFIE").length;
  const enAttente = fournisseurs.filter((f) => f.statut === "EN_ATTENTE").length;
  const alertes = fournisseurs.filter((f) => f.statut === "SUSPENDU" || f.statut === "REJETE" || f.statut === "BLACKLISTE").length;
  const pmeLocales = fournisseurs.filter((f) => (f.pays ?? "").toLowerCase().includes("tchad")).length;
  const scores = fournisseurs.map(trustScore);
  const scoreMoyen = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const sectorCounts = new Map<string, number>();
  for (const f of fournisseurs) {
    for (const d of f.domainesExpertise ?? []) {
      sectorCounts.set(d, (sectorCounts.get(d) ?? 0) + 1);
    }
  }
  const topSectors = Array.from(sectorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxSector = topSectors[0]?.[1] ?? 1;

  const villes = new Map<string, number>();
  for (const f of fournisseurs) {
    const v = f.ville ?? "—";
    villes.set(v, (villes.get(v) ?? 0) + 1);
  }
  const topVilles = Array.from(villes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const aSurveiller = fournisseurs.filter((f) => trustScore(f) < 65 || f.statut === "SUSPENDU").slice(0, 4);

  const tabs: Array<{ k: string; label: string; count: number; statut?: string }> = [
    { k: "all", label: "Tous", count: total },
    { k: "verifie", label: "Vérifiés", count: verifies, statut: "VERIFIE" },
    { k: "attente", label: "En attente", count: enAttente, statut: "EN_ATTENTE" },
    { k: "alerte", label: "Alertes", count: alertes },
  ];
  const activeTab = !statut ? "all" : statut === "VERIFIE" ? "verifie" : statut === "EN_ATTENTE" ? "attente" : "alerte";

  return (
    <div className="fpage">
      <header className="fhead">
        <div>
          <h1>Le carnet d&apos;adresses <em>de la confiance.</em></h1>
          <p className="lede">
            <strong>{total} fournisseur{total > 1 ? "s" : ""} référencé{total > 1 ? "s" : ""}</strong>
            {" "}·{" "}scoring construit sur l&apos;historique des marchés, la conformité documentaire et la complétude du dossier.
          </p>
        </div>
        <div className="fhead-actions">
          <Link href="/fournisseurs/nouveau" className="btn btn--accent btn--sm">
            <i className="ph ph-plus" aria-hidden="true"></i> Référencer un fournisseur
          </Link>
        </div>
      </header>

      <div className="fstats">
        <div className="fstat">
          <div className="l">Total référencés</div>
          <div className="v">{total}</div>
          <div className="d">parc complet</div>
        </div>
        <div className="fstat">
          <div className="l">Score moyen</div>
          <div className="v">{scoreMoyen}<em>/100</em></div>
          <div className={`d ${scoreMoyen >= 70 ? "up" : scoreMoyen >= 50 ? "" : "down"}`}>confiance globale</div>
        </div>
        <div className="fstat">
          <div className="l">Vérifiés</div>
          <div className="v">{verifies}</div>
          <div className="d">{total > 0 ? Math.round((verifies / total) * 100) : 0}% du parc</div>
        </div>
        <div className="fstat">
          <div className="l">PME Tchad</div>
          <div className="v">{pmeLocales}</div>
          <div className="d">{total > 0 ? Math.round((pmeLocales / total) * 100) : 0}% locales</div>
        </div>
        <div className="fstat">
          <div className="l">Alertes</div>
          <div className="v">{alertes}</div>
          <div className={`d ${alertes > 0 ? "down" : ""}`}>à examiner</div>
        </div>
      </div>

      <form method="get" className="fbar">
        <label className="search">
          <i className="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input
            name="q"
            type="text"
            defaultValue={q ?? ""}
            placeholder="Rechercher un fournisseur, un RCCM, un secteur…"
          />
          <span className="kbd">/</span>
        </label>
        <span className="sep-vert"></span>
        {tabs.map((t) => {
          const href = t.statut
            ? `/fournisseurs?statut=${t.statut}`
            : t.k === "alerte"
              ? `/fournisseurs?statut=SUSPENDU`
              : `/fournisseurs`;
          const isOn = activeTab === t.k;
          return (
            <Link key={t.k} href={href} className={`chip ${isOn ? "on" : ""}`}>
              {t.label} <span className="ct">{t.count}</span>
            </Link>
          );
        })}
        <span className="sep-vert"></span>
        <select name="categorie" className="select" defaultValue={categorie ?? ""} style={{ height: 30, padding: "0 10px", fontSize: 12 }}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="btn btn--secondary btn--sm">Filtrer</button>
      </form>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      <div className="fmain">
        {fournisseurs.length === 0 ? (
          <div className="empty" style={{ gridColumn: "1 / -1" }}>
            <div className="ic"><i className="ph ph-buildings" aria-hidden="true"></i></div>
            <h3 className="t">Annuaire <em>vide</em></h3>
            <p className="s">{q || statut || categorie ? "Aucun fournisseur ne correspond à ces filtres." : "Inscrivez votre premier fournisseur pour qu'il puisse soumissionner."}</p>
            <Link href="/fournisseurs/nouveau" className="btn btn--primary">
              <i className="ph ph-plus" aria-hidden="true"></i> Inscrire un fournisseur
            </Link>
          </div>
        ) : (
          <>
            <div className="fgrid">
              {fournisseurs.map((f) => {
                const score = trustScore(f);
                const initials = initialsOf(f.sigle || f.raisonSociale);
                const tone = logoTone(f.id);
                const isVerifie = f.statut === "VERIFIE";
                const isPmeLocale = (f.pays ?? "").toLowerCase().includes("tchad") && f.categorie !== "ONG_INTERNATIONALE";
                const tags = (f.domainesExpertise ?? []).slice(0, 3);
                if (f.statut === "SUSPENDU" || f.statut === "REJETE") {
                  tags.push("__alerte__");
                }
                const ringDash = `${(score / 100) * 94.2} 100`;
                return (
                  <Link key={f.id} href={`/fournisseurs/${f.id}`} className={`fcard ${isVerifie ? "starred" : ""}`}>
                    <div className="fcard-top">
                      <div className={`fcard-logo ${tone}`}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3>
                          {f.raisonSociale}
                          {f.sigle && <em> {f.sigle}</em>}
                        </h3>
                        <div className="meta">
                          {f.numeroRccm && <span>RCCM {f.numeroRccm}</span>}
                          {f.numeroRccm && (f.ville || isPmeLocale) && <span className="sep-d">·</span>}
                          {f.ville && <span>{f.ville}</span>}
                          {isPmeLocale && f.ville && <span className="sep-d">·</span>}
                          {isPmeLocale && <span className="pme">PME locale</span>}
                        </div>
                      </div>
                      <div className="ring" title={`Score ${score}/100`}>
                        <svg viewBox="0 0 36 36">
                          <circle className="ring-bg" cx="18" cy="18" r="15"/>
                          <circle className={`ring-fg ${ringClass(score)}`} cx="18" cy="18" r="15" strokeDasharray={ringDash}/>
                        </svg>
                        <div className="v">{score}</div>
                      </div>
                    </div>
                    <p className="fcard-body">
                      {CATEGORIE_LABEL[f.categorie] ?? f.categorie}
                      {f.anneesExperience ? ` · ${f.anneesExperience} an${f.anneesExperience > 1 ? "s" : ""} d'expérience` : ""}
                      {f.statut === "SUSPENDU" && <> · ⚠ Suspension en cours</>}
                      {f.statut === "REJETE" && <> · ⚠ Dossier rejeté</>}
                    </p>
                    {tags.length > 0 && (
                      <div className="fcard-tags">
                        {tags.map((t, i) =>
                          t === "__alerte__" ? (
                            <span key={i} className="fcard-tag warn">Alerte conformité</span>
                          ) : (
                            <span key={i} className="fcard-tag">{t}</span>
                          )
                        )}
                      </div>
                    )}
                    <div className="fcard-stats">
                      <div>
                        <div className="l">Soumissions</div>
                        <div className={`v ${(f._count?.soumissions ?? 0) > 0 ? "win" : ""}`}>{f._count?.soumissions ?? 0}</div>
                      </div>
                      <div>
                        <div className="l">Évaluations</div>
                        <div className="v">{f._count?.evaluations ?? 0}</div>
                      </div>
                      <div>
                        <div className="l">Documents</div>
                        <div className="v">{f._count?.documents ?? 0}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <aside className="frail">
              <div className="rcard">
                <h4>Géographie <em>du parc</em></h4>
                <p className="sub">Top {topVilles.length} villes</p>
                {topVilles.map(([ville, n]) => (
                  <div key={ville} className="sbar">
                    <span className="l">{ville}</span>
                    <span className="bar">
                      <span style={{ width: `${(n / (topVilles[0]?.[1] ?? 1)) * 100}%` }}></span>
                    </span>
                    <span className="v">{n}</span>
                  </div>
                ))}
              </div>

              {topSectors.length > 0 && (
                <div className="rcard">
                  <h4>Secteurs <em>couverts</em></h4>
                  <p className="sub">Domaines d&apos;expertise</p>
                  {topSectors.map(([sector, n]) => (
                    <div key={sector} className="sbar">
                      <span className="l">{sector}</span>
                      <span className="bar">
                        <span style={{ width: `${(n / maxSector) * 100}%` }}></span>
                      </span>
                      <span className="v">{n}</span>
                    </div>
                  ))}
                </div>
              )}

              {aSurveiller.length > 0 && (
                <div className="rcard">
                  <h4>À surveiller <em>cette semaine</em></h4>
                  <p className="sub">{aSurveiller.length} dossier{aSurveiller.length > 1 ? "s" : ""} sous le seuil</p>
                  {aSurveiller.map((f) => {
                    const tone = logoTone(f.id);
                    const colorClass = tone === "t1" ? "avatar--terracotta" : tone === "t2" ? "avatar--success" : tone === "t3" ? "avatar--info" : "avatar--mineral";
                    return (
                      <div key={f.id} className="wrow">
                        <span className={`avatar avatar--sm ${colorClass}`}>{initialsOf(f.sigle || f.raisonSociale)}</span>
                        <div className="body">
                          <strong>{f.raisonSociale}</strong>
                          <small>
                            {f.statut === "SUSPENDU" ? "⚠ Suspendu" : f.statut === "REJETE" ? "⚠ Rejeté" : `⚠ Score ${trustScore(f)}/100`}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
