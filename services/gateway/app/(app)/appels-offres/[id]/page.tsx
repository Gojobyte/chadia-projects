import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  description: string;
  type: string;
  categorie: string;
  secteur?: string | null;
  statut: string;
  budgetEstime?: number | null;
  devise?: string | null;
  datePublication?: string | null;
  dateLimiteDepot: string;
  lieuExecution?: string | null;
  bailleur: { id: string; nom: string; sigle: string };
  _count?: { soumissions: number; documents: number };
}

function fmtMoney(n: number | null | undefined, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

async function publishAction(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");
  await TenderAPI.publishAppelOffre(id, token);
  revalidatePath(`/appels-offres/${id}`);
  revalidatePath("/appels-offres");
}

export default async function AppelOffreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let ao: AppelOffre | null = null;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.getAppelOffre(id);
    ao = data.appelOffre ?? null;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  if (errorMsg || !ao) {
    return (
      <div className="empty">
        <div className="ic"><i className="ph ph-warning-octagon" aria-hidden="true"></i></div>
        <h3 className="t">Appel d&apos;offre <em>introuvable</em></h3>
        <p className="s">{errorMsg ?? "Cet identifiant ne correspond à aucun appel d'offre."}</p>
        <Link href="/appels-offres" className="btn btn--secondary">Retour à la liste</Link>
      </div>
    );
  }

  const canPublish =
    (session.user.role === "ADMIN" || session.user.role === "DIRECTEUR") &&
    ao.statut === "BROUILLON";
  const publish = publishAction.bind(null, ao.id);
  const typeLabel = ao.type.replace(/_/g, " ").toLowerCase();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--color-line)" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="page-eyebrow">{ao.reference}</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>{ao.titre}</h1>
          <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: "var(--text-sm)", color: "var(--color-shale)", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{ao.bailleur.sigle}</span>
            <span style={{ color: "var(--color-mineral)" }}>·</span>
            <span style={{ textTransform: "capitalize" }}>{typeLabel}</span>
            <span style={{ color: "var(--color-mineral)" }}>·</span>
            <span>{ao.categorie}</span>
            {ao.secteur && (<><span style={{ color: "var(--color-mineral)" }}>·</span><span>{ao.secteur}</span></>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <span className={`badge badge--lg ${STATUT_BADGE[ao.statut] ?? "badge--draft"}`}>
            <span className="dot"></span>
            {STATUT_LABEL[ao.statut] ?? ao.statut}
          </span>
          {canPublish && (
            <form action={publish}>
              <button type="submit" className="btn btn--accent">
                <i className="ph ph-paper-plane-tilt" aria-hidden="true"></i>
                Publier
              </button>
            </form>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="lbl">Budget estimé</div>
          <div className="val">
            {ao.budgetEstime != null
              ? <>{new Intl.NumberFormat("fr-FR").format(ao.budgetEstime)}<span className="unit"> {ao.devise ?? "FCFA"}</span></>
              : "—"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Date limite</div>
          <div className="val" style={{ fontSize: "var(--text-xl)" }}>{fmtDate(ao.dateLimiteDepot)}</div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Soumissions</div>
          <div className="val tabular-nums">{ao._count?.soumissions ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Publication</div>
          <div className="val" style={{ fontSize: "var(--text-xl)" }}>
            {ao.statut === "BROUILLON" ? "—" : fmtDate(ao.datePublication)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <section className="card" style={{ padding: 24 }}>
          <div className="eyebrow" style={{ color: "var(--color-ink)", marginBottom: 12 }}>Description</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-sepia)", lineHeight: "var(--leading-relax)", whiteSpace: "pre-wrap" }}>
            {ao.description}
          </div>
        </section>

        <aside className="sheet" style={{ width: "100%", borderRadius: "var(--radius-md)" }}>
          <div className="sheet-h">
            <h4>Informations</h4>
          </div>
          <div className="sheet-b">
            <dl style={{ margin: 0 }}>
              <div className="sheet-row">
                <dt>Bailleur</dt>
                <dd>{ao.bailleur.nom}</dd>
              </div>
              <div className="sheet-row">
                <dt>Type</dt>
                <dd style={{ textTransform: "capitalize" }}>{typeLabel}</dd>
              </div>
              <div className="sheet-row">
                <dt>Catégorie</dt>
                <dd>{ao.categorie}</dd>
              </div>
              {ao.secteur && (
                <div className="sheet-row">
                  <dt>Secteur</dt>
                  <dd>{ao.secteur}</dd>
                </div>
              )}
              {ao.lieuExecution && (
                <div className="sheet-row">
                  <dt>Lieu</dt>
                  <dd>{ao.lieuExecution}</dd>
                </div>
              )}
              <div className="sheet-row">
                <dt>Référence</dt>
                <dd className="mono" style={{ fontSize: "var(--text-xs)" }}>{ao.reference}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
