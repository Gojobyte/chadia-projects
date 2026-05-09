import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

const statutLabels: Record<string, string> = {
  EN_ATTENTE: "En attente", VERIFIE: "Vérifié", REJETE: "Rejeté",
  SUSPENDU: "Suspendu", BLACKLISTE: "Blackliste",
};

const statutColors: Record<string, string> = {
  EN_ATTENTE: "var(--warning)", VERIFIE: "var(--success)", REJETE: "var(--danger)",
  SUSPENDU: "var(--text-3)", BLACKLISTE: "var(--danger)",
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
    total = data.total ?? 0;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fournisseurs</div>
          <div className="page-subtitle">
            {total} fournisseur{total > 1 ? "s" : ""} · service tender
          </div>
        </div>
        <div className="page-actions">
          <Link href="/fournisseurs/nouveau" className="btn btn-primary">+ Inscrire un fournisseur</Link>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--danger-soft, #fee)", color: "var(--danger)" }}>
          Service tender indisponible : {errorMsg}
        </div>
      )}

      {fournisseurs.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          {errorMsg ? "Impossible de charger la liste." : "Aucun fournisseur enregistré."}
        </div>
      ) : (
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 80px", gap: 8, padding: "8px 16px", fontSize: 11, color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
            <span>Fournisseur</span><span>Catégorie</span>
            <span style={{ textAlign: "center" }}>Soumissions</span>
            <span style={{ textAlign: "center" }}>Évaluations</span>
            <span>Statut</span>
          </div>
          {fournisseurs.map((f, i) => (
            <Link
              key={f.id}
              href={`/fournisseurs/${f.id}`}
              style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 80px", gap: 8, padding: "12px 16px", borderBottom: i === fournisseurs.length - 1 ? "none" : "1px solid var(--border)", alignItems: "center", textDecoration: "none", color: "inherit" }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{f.raisonSociale}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{f.email}{f.ville ? ` · ${f.ville}` : ""}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{f.categorie}</div>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>{f._count.soumissions}</div>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>{f._count.evaluations}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: statutColors[f.statut], padding: "2px 8px", borderRadius: 3, background: `${statutColors[f.statut]}15` }}>
                {statutLabels[f.statut] ?? f.statut}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
