import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "En évaluation", ATTRIBUE: "Attribué",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

const statutColors: Record<string, string> = {
  BROUILLON: "var(--text-3)", PUBLIE: "var(--info)", EN_COURS: "var(--primary)",
  CLOTURE: "var(--warning)", EN_EVALUATION: "var(--secondary, var(--accent))",
  ATTRIBUE: "var(--success)", ANNULE: "var(--danger)", ARCHIVE: "var(--text-3)",
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
      <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
        {errorMsg ?? "Appel d'offre introuvable."}
      </div>
    );
  }

  const canPublish = (session.user.role === "ADMIN" || session.user.role === "DIRECTEUR") && ao.statut === "BROUILLON";
  const publish = publishAction.bind(null, ao.id);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "ui-monospace, monospace", marginBottom: 4 }}>{ao.reference}</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.015em" }}>{ao.titre}</h1>
          <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text-3)", flexWrap: "wrap" }}>
            <span>{ao.bailleur.sigle}</span>
            <span>·</span>
            <span>{ao.type.replace(/_/g, " ").toLowerCase()}</span>
            <span>·</span>
            <span>{ao.categorie}</span>
            {ao.secteur && <><span>·</span><span>{ao.secteur}</span></>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 10px", borderRadius: 4, background: `${statutColors[ao.statut]}1a`, color: statutColors[ao.statut] }}>
            {statutLabels[ao.statut] ?? ao.statut}
          </span>
          {canPublish && (
            <form action={publish}>
              <button type="submit" className="btn btn-primary">Publier</button>
            </form>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Budget estimé</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmtMoney(ao.budgetEstime, ao.devise ?? "FCFA")}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Date limite</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{fmtDate(ao.dateLimiteDepot)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Soumissions</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{ao._count?.soumissions ?? 0}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Publication</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{ao.statut === "BROUILLON" ? "—" : fmtDate(ao.datePublication)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Description</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{ao.description}</div>
      </div>

      {ao.lieuExecution && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Lieu d&apos;exécution</div>
          <div style={{ fontSize: 13, color: "var(--text)" }}>{ao.lieuExecution}</div>
        </div>
      )}
    </>
  );
}
