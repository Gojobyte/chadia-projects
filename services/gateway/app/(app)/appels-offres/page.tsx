import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: "badge--draft",
  PUBLIE: "badge--published",
  EN_COURS: "badge--review",
  CLOTURE: "badge--closed",
  EN_EVALUATION: "badge--review",
  ATTRIBUE: "badge--awarded",
  ANNULE: "badge--canceled",
  ARCHIVE: "badge--archived",
};
const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "En évaluation", ATTRIBUE: "Attribué",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

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
  bailleur: { nom: string; sigle: string };
  _count: { soumissions: number };
}

function fmtMoney(n: number | null | undefined, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}
function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 864e5);
}

export default async function AppelsOffresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; categorie?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, statut, categorie } = await searchParams;
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (statut) params.statut = statut;
  if (categorie) params.categorie = categorie;

  let appelsOffres: AppelOffre[] = [];
  let total = 0;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listAppelsOffres(params);
    appelsOffres = data.appelsOffres ?? [];
    total = data.total ?? 0;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Marchés publics</div>
          <h1 className="page-title">Appels d&apos;<em>offres</em></h1>
          <p className="page-subtitle">
            <span className="tabular-nums">{total}</span> appel{total > 1 ? "s" : ""} d&apos;offre{total > 1 ? "s" : ""} référencé{total > 1 ? "s" : ""}.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/appels-offres/nouveau" className="btn btn--primary">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Nouvel appel d&apos;offre
          </Link>
        </div>
      </div>

      <form method="get" style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div className="input-wrap" style={{ flex: 1, minWidth: 280, maxWidth: 380 }}>
          <i className="ph ph-magnifying-glass icon-l" aria-hidden="true"></i>
          <input
            name="q"
            type="text"
            defaultValue={q ?? ""}
            placeholder="Rechercher une référence ou un titre…"
            className="input has-l"
          />
        </div>
        <div className="select-wrap" style={{ minWidth: 180 }}>
          <select name="statut" className="select" defaultValue={statut ?? ""}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="select-wrap" style={{ minWidth: 180 }}>
          <select name="categorie" className="select" defaultValue={categorie ?? ""}>
            <option value="">Toutes catégories</option>
            <option value="TRAVAUX">Travaux</option>
            <option value="FOURNITURES">Fournitures</option>
            <option value="SERVICES">Services</option>
            <option value="MIXTE">Mixte</option>
          </select>
        </div>
        <button type="submit" className="btn btn--secondary">Filtrer</button>
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
          <p className="s">{q || statut || categorie ? "Aucun résultat avec ces filtres. Essayez d'élargir la recherche." : "Lancez votre premier appel d'offre pour démarrer."}</p>
          <Link href="/appels-offres/nouveau" className="btn btn--primary">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Nouvel appel d&apos;offre
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
          {appelsOffres.map((ao) => {
            const days = daysUntil(ao.dateLimiteDepot);
            const isUrgent = days <= 7 && days >= 0;
            const isClosed = days < 0 || ao.statut === "CLOTURE" || ao.statut === "ATTRIBUE" || ao.statut === "ANNULE";
            return (
              <Link key={ao.id} href={`/appels-offres/${ao.id}`} className="card card--interactive" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="card-meta" style={{ marginBottom: 4 }}>{ao.reference}</div>
                    <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--color-ink)", lineHeight: "var(--leading-snug)" }}>
                      {ao.titre}
                    </div>
                  </div>
                  <span className={`badge ${STATUT_BADGE[ao.statut] ?? "badge--draft"}`} style={{ flexShrink: 0 }}>
                    <span className="dot"></span>
                    {STATUT_LABEL[ao.statut] ?? ao.statut}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, fontSize: "var(--text-xs)", color: "var(--color-shale)", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600 }}>{ao.bailleur?.sigle ?? "—"}</span>
                  <span style={{ color: "var(--color-mineral)" }}>·</span>
                  <span>{ao.categorie}</span>
                  {ao.secteur && (<><span style={{ color: "var(--color-mineral)" }}>·</span><span>{ao.secteur}</span></>)}
                </div>

                {ao.budgetEstime != null && (
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--color-ink)", letterSpacing: "var(--tracking-tight)" }}>
                    {fmtMoney(ao.budgetEstime, ao.devise ?? "FCFA")}
                  </div>
                )}

                <div className="card-foot">
                  <span style={{ color: isUrgent ? "var(--color-warning)" : "var(--color-stone)", fontWeight: isUrgent ? 600 : 400 }}>
                    {isClosed ? "Clôturé" : `Limite ${fmtDate(ao.dateLimiteDepot)}`}
                    {isUrgent && ` (J-${days})`}
                  </span>
                  <span style={{ color: "var(--color-stone)" }}>
                    <span className="tabular-nums">{ao._count?.soumissions ?? 0}</span> soumission{(ao._count?.soumissions ?? 0) > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
