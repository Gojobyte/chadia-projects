import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "En évaluation", ATTRIBUE: "Attribué",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

const statutColors: Record<string, string> = {
  BROUILLON: "var(--text-3)", PUBLIE: "var(--info)", EN_COURS: "var(--primary)",
  CLOTURE: "var(--warning)", EN_EVALUATION: "var(--secondary)",
  ATTRIBUE: "var(--success)", ANNULE: "var(--danger)", ARCHIVE: "var(--text-3)",
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
          <div className="page-title">Appels d&apos;offres</div>
          <div className="page-subtitle">{total} appel{total > 1 ? "s" : ""} d&apos;offre{total > 1 ? "s" : ""} · service tender</div>
        </div>
        <div className="page-actions">
          <Link href="/appels-offres/nouveau" className="btn btn-primary">+ Nouvel appel d&apos;offre</Link>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--danger-soft, #fee)", color: "var(--danger)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      {appelsOffres.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          {errorMsg ? "Impossible de charger les appels d'offres." : "Aucun appel d'offre."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
          {appelsOffres.map((ao) => {
            const days = daysUntil(ao.dateLimiteDepot);
            const isUrgent = days <= 7 && days >= 0;
            const isClosed = days < 0 || ao.statut === "CLOTURE" || ao.statut === "ATTRIBUE" || ao.statut === "ANNULE";
            return (
              <Link
                key={ao.id}
                href={`/appels-offres/${ao.id}`}
                className="card"
                style={{ padding: 16, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace", marginBottom: 2 }}>{ao.reference}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", lineHeight: 1.3 }}>{ao.titre}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: statutColors[ao.statut], background: `${statutColors[ao.statut]}15`, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
                    {statutLabels[ao.statut] ?? ao.statut}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{ao.bailleur?.sigle ?? "—"}</span>
                  <span>·</span>
                  <span>{ao.categorie}</span>
                  {ao.secteur && <><span>·</span><span>{ao.secteur}</span></>}
                </div>
                {ao.budgetEstime != null && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                    Budget : {fmtMoney(ao.budgetEstime, ao.devise ?? "FCFA")}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11.5, color: isUrgent ? "var(--warning)" : "var(--text-3)" }}>
                    {isClosed ? "Clôturé" : `Limite : ${fmtDate(ao.dateLimiteDepot)}`}
                    {isUrgent && ` (J-${days})`}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {ao._count?.soumissions ?? 0} soumission{(ao._count?.soumissions ?? 0) > 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
