import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUT_BADGE: Record<string, string> = {
  EN_ATTENTE: "badge--scheduled",
  VERIFIE: "badge--published",
  REJETE: "badge--canceled",
  SUSPENDU: "badge--closed",
  BLACKLISTE: "badge--canceled",
};
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
  email: string;
  ville?: string | null;
  categorie: string;
  statut: string;
  _count: { soumissions: number; evaluations: number; documents: number };
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Annuaire</div>
          <h1 className="page-title">Fourni<em>sseurs</em></h1>
          <p className="page-subtitle">
            <span className="tabular-nums">{total}</span> fournisseur{total > 1 ? "s" : ""} référencé{total > 1 ? "s" : ""}
            {fournisseurs.length > 0 && <> · <span className="tabular-nums">{fournisseurs.filter((f) => f.statut === "VERIFIE").length}</span> vérifié{fournisseurs.filter((f) => f.statut === "VERIFIE").length > 1 ? "s" : ""}</>}
          </p>
        </div>
        <div className="page-actions">
          <Link href="/fournisseurs/nouveau" className="btn btn--primary">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Inscrire un fournisseur
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
            placeholder="Rechercher par raison sociale, sigle ou email…"
            className="input has-l"
          />
        </div>
        <div className="select-wrap" style={{ minWidth: 180 }}>
          <select name="statut" className="select" defaultValue={statut ?? ""}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="select-wrap" style={{ minWidth: 200 }}>
          <select name="categorie" className="select" defaultValue={categorie ?? ""}>
            <option value="">Toutes catégories</option>
            {Object.entries(CATEGORIE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn--secondary">Filtrer</button>
      </form>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      {fournisseurs.length === 0 ? (
        <div className="empty">
          <div className="ic"><i className="ph ph-buildings" aria-hidden="true"></i></div>
          <h3 className="t">Annuaire <em>vide</em></h3>
          <p className="s">{q || statut || categorie ? "Aucun fournisseur ne correspond à ces filtres." : "Inscrivez votre premier fournisseur pour qu'il puisse soumissionner."}</p>
          <Link href="/fournisseurs/nouveau" className="btn btn--primary">
            <i className="ph ph-plus" aria-hidden="true"></i>
            Inscrire un fournisseur
          </Link>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Catégorie</th>
              <th style={{ textAlign: "right" }}>Soumissions</th>
              <th style={{ textAlign: "right" }}>Évaluations</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map((f) => (
              <tr key={f.id}>
                <td>
                  <Link href={`/fournisseurs/${f.id}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
                    <div className="avatar avatar--sm avatar--mineral">{initialsOf(f.sigle || f.raisonSociale)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>{f.raisonSociale}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-stone)" }}>
                        {f.email}{f.ville ? ` · ${f.ville}` : ""}
                      </div>
                    </div>
                  </Link>
                </td>
                <td style={{ color: "var(--color-shale)", fontSize: "var(--text-xs)" }}>
                  {CATEGORIE_LABEL[f.categorie] ?? f.categorie}
                </td>
                <td className="num">{f._count?.soumissions ?? 0}</td>
                <td className="num">{f._count?.evaluations ?? 0}</td>
                <td>
                  <span className={`badge ${STATUT_BADGE[f.statut] ?? "badge--draft"}`}>
                    <span className="dot"></span>
                    {STATUT_LABEL[f.statut] ?? f.statut}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
