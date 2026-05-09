import { TenderAPI } from "@/lib/api";

interface AppelOffreResultat {
  id: string;
  fournisseurRetenuNom?: string | null;
  montantAttribue?: number | null;
  devise?: string | null;
  nombreSoumissions: number;
  publieAt?: string | null;
  appelOffre: {
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

function fmtMoney(n: number | null | undefined, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ResultatsPage({
  searchParams,
}: {
  searchParams: Promise<{ bailleurId?: string; secteur?: string }>;
}) {
  const { bailleurId, secteur } = await searchParams;
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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Résultats des marchés publics</div>
          <div className="page-subtitle">Transparence · {resultats.length} résultat{resultats.length > 1 ? "s" : ""} publié{resultats.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--danger-soft, #fee)", color: "var(--danger)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      {resultats.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          {errorMsg ? "Impossible de charger les résultats." : "Aucun résultat publié pour le moment."}
        </div>
      ) : (
        <div className="card">
          {resultats.map((r, i) => (
            <div key={r.id} style={{ padding: "14px 16px", borderBottom: i === resultats.length - 1 ? "none" : "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace", marginBottom: 2 }}>{r.appelOffre.reference}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{r.appelOffre.titre}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 8 }}>
                    <span>{r.appelOffre.bailleur?.sigle ?? "—"}</span>
                    <span>·</span>
                    <span>{r.appelOffre.categorie}</span>
                    {r.appelOffre.secteur && <><span>·</span><span>{r.appelOffre.secteur}</span></>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Publié le</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>{fmtDate(r.publieAt)}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Fournisseur retenu</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--success)" }}>{r.fournisseurRetenuNom ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Montant attribué</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(r.montantAttribue, r.devise ?? "FCFA")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Soumissions</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{r.nombreSoumissions}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Budget initial</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(r.appelOffre.budgetEstime, r.appelOffre.devise ?? "FCFA")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
