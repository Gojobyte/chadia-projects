import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const statutLabels: Record<string, string> = {
  EN_ATTENTE: "En attente", VERIFIE: "Verifie", REJETE: "Rejete",
  SUSPENDU: "Suspendu", BLACKLISTE: "Blackliste",
};

const statutColors: Record<string, string> = {
  EN_ATTENTE: "var(--warning)", VERIFIE: "var(--success)", REJETE: "var(--danger)",
  SUSPENDU: "var(--text-3)", BLACKLISTE: "var(--danger)",
};

const categorieLabels: Record<string, string> = {
  ENTREPRISE_INDIVIDUELLE: "Entreprise individuelle",
  SARL: "SARL", SA: "SA", ONG_NATIONALE: "ONG nationale",
  ONG_INTERNATIONALE: "ONG internationale", COOPERATIVE: "Cooperative",
  CONSORTIUM: "Consortium", AUTRE: "Autre",
};

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; categorie?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, statut, categorie } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { raisonSociale: { contains: q, mode: "insensitive" } },
      { sigle: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (statut) where.statut = statut;
  if (categorie) where.categorie = categorie;

  const fournisseurs = await prisma.fournisseur.findMany({
    where,
    include: {
      _count: { select: { soumissions: true, evaluations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Fournisseurs</div>
          <div className="page-subtitle">{fournisseurs.length} fournisseur{fournisseurs.length > 1 ? "s" : ""} · {fournisseurs.filter(f => f.statut === "VERIFIE").length} verifie{fournisseurs.filter(f => f.statut === "VERIFIE").length > 1 ? "s" : ""}</div>
        </div>
        <div className="page-actions">
          <Link href="/fournisseurs/nouveau" className="btn btn-primary">
            + Inscrire un fournisseur
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Rechercher..."
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text)" }}
          />
          <select name="statut" defaultValue={statut ?? ""} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text)" }}>
            <option value="">Tous les statuts</option>
            {Object.entries(statutLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="categorie" defaultValue={categorie ?? ""} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text)" }}>
            <option value="">Toutes les categories</option>
            {Object.entries(categorieLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary btn-sm">Filtrer</button>
        </form>
      </div>

      {fournisseurs.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          Aucun fournisseur trouve.
        </div>
      ) : (
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 100px 80px", gap: 8, padding: "8px 16px", fontSize: 11, color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
            <span>Fournisseur</span>
            <span>Categorie</span>
            <span style={{ textAlign: "center" }}>Soumissions</span>
            <span style={{ textAlign: "center" }}>Evaluations</span>
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
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{f.email} {f.ville ? `· ${f.ville}` : ""}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{categorieLabels[f.categorie] ?? f.categorie}</div>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>{f._count.soumissions}</div>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-2)" }}>{f._count.evaluations}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: statutColors[f.statut], padding: "2px 8px", borderRadius: 3, background: `${statutColors[f.statut]}15` }}>
                {statutLabels[f.statut]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
