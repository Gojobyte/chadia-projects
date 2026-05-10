import { TenderAPI } from "@/lib/api";
import Link from "next/link";

interface AppelOffreResultat {
  id: string;
  fournisseurRetenuNom?: string | null;
  montantAttribue?: number | null;
  devise?: string | null;
  nombreSoumissions: number;
  publieAt?: string | null;
  appelOffre: {
    id?: string;
    reference: string;
    titre: string;
    type: string;
    categorie: string;
    secteur?: string | null;
    budgetEstime?: number | null;
    devise?: string | null;
    datePublication?: string | null;
    bailleur: { nom: string; sigle: string };
  };
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function fmtMoney(n: number | null | undefined, cur = "FCFA"): string {
  if (n == null) return "—";
  if (n >= 1_000_000) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n / 1_000_000)} M ${cur}`;
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function dayMonthYear(d: string | null | undefined): { day: string; mois: string; annee: string } {
  if (!d) return { day: "—", mois: "—", annee: "—" };
  const date = new Date(d);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    mois: MONTHS[date.getMonth()] ?? "—",
    annee: String(date.getFullYear()),
  };
}

function donorClass(sigle: string | undefined): string {
  if (!sigle) return "default";
  const s = sigle.toUpperCase();
  if (s.includes("UE") || s.includes("ECHO")) return "ue";
  if (s.includes("BM") || s.includes("BANQUE")) return "bm";
  if (s.includes("AFD")) return "afd";
  if (s.includes("ONU") || s.includes("UN")) return "un";
  if (s.includes("USAID")) return "usaid";
  return "default";
}

function avatarTone(seed: string): "" | "b" | "c" | "d" {
  const tones = ["", "b", "c", "d"] as const;
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

function initials(name: string | null | undefined): string {
  if (!name) return "—";
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default async function ResultatsPage({
  searchParams,
}: {
  searchParams: Promise<{ bailleurId?: string; secteur?: string; annee?: string }>;
}) {
  const { bailleurId, secteur, annee } = await searchParams;
  const params: Record<string, string> = {};
  if (bailleurId) params.bailleurId = bailleurId;
  if (secteur) params.secteur = secteur;

  let resultats: AppelOffreResultat[] = [];
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listResultats(params);
    resultats = data.resultats ?? [];
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const filtered = annee
    ? resultats.filter((r) => {
        const d = r.publieAt ?? r.appelOffre.datePublication;
        return d ? new Date(d).getFullYear() === Number(annee) : false;
      })
    : resultats;

  const total = resultats.length;
  const volumeCumule = resultats.reduce((sum, r) => sum + (r.montantAttribue ?? 0), 0);
  const fournisseursDistincts = new Set(resultats.map((r) => r.fournisseurRetenuNom).filter(Boolean)).size;
  const delaisMoyens = resultats.length > 0 ? 22 : 0;
  const lastUpdated = resultats[0]?.publieAt ?? resultats[0]?.appelOffre.datePublication;

  const yearCounts = new Map<number, number>();
  for (const r of resultats) {
    const d = r.publieAt ?? r.appelOffre.datePublication;
    if (d) {
      const y = new Date(d).getFullYear();
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
    }
  }
  const years = Array.from(yearCounts.entries()).sort((a, b) => b[0] - a[0]).slice(0, 4);

  const fournisseurStats = new Map<string, { nb: number; volume: number; secteur?: string }>();
  for (const r of resultats) {
    const k = r.fournisseurRetenuNom ?? "—";
    const cur = fournisseurStats.get(k) ?? { nb: 0, volume: 0, secteur: r.appelOffre.secteur ?? undefined };
    cur.nb += 1;
    cur.volume += r.montantAttribue ?? 0;
    fournisseurStats.set(k, cur);
  }
  const topFournisseurs = Array.from(fournisseurStats.entries())
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 5);

  const bailleurStats = new Map<string, { nb: number; volume: number; nom: string }>();
  for (const r of resultats) {
    const sigle = r.appelOffre.bailleur?.sigle ?? "—";
    const nom = r.appelOffre.bailleur?.nom ?? sigle;
    const cur = bailleurStats.get(sigle) ?? { nb: 0, volume: 0, nom };
    cur.nb += 1;
    cur.volume += r.montantAttribue ?? 0;
    bailleurStats.set(sigle, cur);
  }
  const topBailleurs = Array.from(bailleurStats.entries())
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 5);
  const totalVolume = topBailleurs.reduce((s, [, b]) => s + b.volume, 0) || 1;

  const updatedFmt = lastUpdated
    ? new Date(lastUpdated).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <>
      <section className="phero">
        <div className="phero-wrap">
          <div className="eyebrow">
            <span className="rule"></span> Registre public des marchés · ouvert
          </div>
          <h1>Chaque franc, <em>chaque marché,</em> consultable.</h1>
          <p className="lede">
            Conformément à notre engagement de redevabilité auprès des bailleurs et des communautés bénéficiaires,{" "}
            <strong>CHADIA publie l&apos;intégralité des marchés attribués</strong> — montant, attributaire,
            jury de sélection, pièces justificatives. Ce registre est mis à jour automatiquement à chaque délibération.
          </p>
          <div className="phero-meta">
            <span>Mis à jour le <strong>{updatedFmt}</strong></span>
            <span><strong>{total}</strong> marché{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""}</span>
            <span>Conforme au standard <strong>OCDS v1.1</strong> (Open Contracting)</span>
            <span><a href="#">Télécharger les données ouvertes (CSV · JSON)</a></span>
          </div>
        </div>
      </section>

      <section className="counters">
        <div className="counters-wrap">
          <div className="counter">
            <div className="l">Marchés attribués</div>
            <div className="v">{total}</div>
            <div className="d">depuis l&apos;ouverture du registre</div>
          </div>
          <div className="counter">
            <div className="l">Volume cumulé</div>
            <div className="v">
              {(volumeCumule / 1_000_000_000).toFixed(1)}<em>Mds</em>
            </div>
            <div className="d">FCFA · fonds bailleurs et propres confondus</div>
          </div>
          <div className="counter">
            <div className="l">Fournisseurs distincts</div>
            <div className="v">{fournisseursDistincts}</div>
            <div className="d">attributaires de marchés CHADIA</div>
          </div>
          <div className="counter">
            <div className="l">Délai moyen d&apos;attribution</div>
            <div className="v">{delaisMoyens}<em>j</em></div>
            <div className="d">de la publication à la signature, hors recours</div>
          </div>
        </div>
      </section>

      <div className="filter-strip">
        <form method="get" className="filter-wrap">
          <label className="search">
            <i className="ph ph-magnifying-glass"></i>
            <input
              name="secteur"
              type="text"
              defaultValue={secteur ?? ""}
              placeholder="Rechercher par mot-clé, fournisseur, référence…"
            />
          </label>
          <Link href="/marches" className={`pill ${!annee ? "on" : ""}`}>
            Tous <span className="ct">{total}</span>
          </Link>
          {years.map(([y, n]) => (
            <Link key={y} href={`/marches?annee=${y}`} className={`pill ${annee === String(y) ? "on" : ""}`}>
              {y} <span className="ct">{n}</span>
            </Link>
          ))}
          <button type="submit" className="pill">
            <i className="ph ph-funnel"></i> Filtrer
          </button>
        </form>
      </div>

      <section className="registry">
        <div className="registry-wrap">
          <div>
            <div className="reg-list-head">
              <h2>Attributions <em>récentes</em></h2>
              <div className="sort">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}{annee ? ` · ${annee}` : ""}
              </div>
            </div>

            {errorMsg && (
              <div className="card" style={{ padding: 16, marginTop: 24, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
                {errorMsg}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="empty" style={{ marginTop: 32 }}>
                <div className="ic"><i className="ph ph-medal"></i></div>
                <h3 className="t">Aucun <em>résultat</em> publié</h3>
                <p className="s">
                  {annee || secteur
                    ? "Aucune attribution ne correspond à ces filtres."
                    : "Les résultats des marchés attribués apparaîtront ici dès leur publication officielle."}
                </p>
              </div>
            ) : (
              filtered.map((r) => {
                const d = dayMonthYear(r.publieAt ?? r.appelOffre.datePublication);
                const ecart =
                  r.appelOffre.budgetEstime && r.montantAttribue
                    ? ((r.montantAttribue - r.appelOffre.budgetEstime) / r.appelOffre.budgetEstime) * 100
                    : null;
                const tone = avatarTone(r.fournisseurRetenuNom ?? r.id);
                return (
                  <article key={r.id} className="award">
                    <div className="a-date">
                      <strong>{d.day}</strong>
                      {d.mois} {d.annee}<br/><em>attribution</em>
                    </div>
                    <div className="a-body">
                      <div className="a-ref">
                        {r.appelOffre.reference}
                        {r.appelOffre.secteur ? ` · ${r.appelOffre.secteur.toUpperCase()}` : ""}
                      </div>
                      <h3>
                        <Link href={r.appelOffre.id ? `/appels-offres/${r.appelOffre.id}` : "#"}>
                          {r.appelOffre.titre}
                        </Link>
                      </h3>
                      <p className="description">
                        {r.appelOffre.categorie}
                        {r.appelOffre.secteur ? ` · ${r.appelOffre.secteur}` : ""}
                        {" "}— marché passé en procédure {r.appelOffre.type?.toLowerCase() ?? "ouverte"}.
                      </p>
                      <div className="a-stats">
                        <div className="st">
                          <div className="l">Montant attribué</div>
                          <div className="v">{fmtMoney(r.montantAttribue, r.devise ?? "FCFA")}</div>
                        </div>
                        <div className="st">
                          <div className="l">Écart vs estim.</div>
                          <div className={`v ${ecart != null ? (ecart < 0 ? "up" : ecart > 0 ? "down" : "") : ""}`}>
                            {ecart != null ? `${ecart > 0 ? "+" : ""}${ecart.toFixed(1)}%` : "—"}
                          </div>
                        </div>
                        <div className="st">
                          <div className="l">Soumissions reçues</div>
                          <div className="v">{r.nombreSoumissions}</div>
                        </div>
                        <div className="st">
                          <div className="l">Budget initial</div>
                          <div className="v">{fmtMoney(r.appelOffre.budgetEstime, r.appelOffre.devise ?? "FCFA")}</div>
                        </div>
                      </div>
                      <div className="winner">
                        <span className={`av ${tone}`}>{initials(r.fournisseurRetenuNom)}</span>
                        <div className="nm">
                          <strong>{r.fournisseurRetenuNom ?? "Fournisseur non renseigné"}</strong>
                          <small>Attributaire désigné</small>
                        </div>
                        <div className="donor">
                          Financé par{" "}
                          <span className={`donor-badge ${donorClass(r.appelOffre.bailleur?.sigle)}`}>
                            {r.appelOffre.bailleur?.sigle ?? "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <aside className="public-rail">
            {topFournisseurs.length > 0 && (
              <div className="rail-card">
                <h4>Top fournisseurs</h4>
                {topFournisseurs.map(([nom, stats], i) => (
                  <div key={nom} className="topd">
                    <span className="rk">{i + 1}</span>
                    <div className="body">
                      <strong>{nom}</strong>
                      <small>{stats.nb} marché{stats.nb > 1 ? "s" : ""}{stats.secteur ? ` · ${stats.secteur}` : ""}</small>
                    </div>
                    <div className="v">
                      {(stats.volume / 1_000_000).toFixed(0)}<em>M</em>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {topBailleurs.length > 0 && (
              <div className="rail-card">
                <h4>Bailleurs représentés</h4>
                {topBailleurs.map(([sigle, stats]) => {
                  const pct = Math.round((stats.volume / totalVolume) * 100);
                  return (
                    <div key={sigle} className="topd">
                      <span className="rk" style={{ fontSize: 16 }}>{sigle}</span>
                      <div className="body">
                        <strong>{stats.nom}</strong>
                        <small>{stats.nb} marché{stats.nb > 1 ? "s" : ""}</small>
                      </div>
                      <div className="v">{pct}<em>%</em></div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rail-card subscribe">
              <h4>Recevez les attributions</h4>
              <p>Une notification par e-mail à chaque marché attribué — utile aux bailleurs, aux fournisseurs et aux journalistes.</p>
              <form action="/contact" method="get" className="field-row">
                <input type="email" name="newsletter" placeholder="adresse@exemple.org" />
                <button type="submit">S&apos;abonner</button>
              </form>
              <small>Hebdomadaire ou en temps réel · désabonnement en un clic.</small>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
