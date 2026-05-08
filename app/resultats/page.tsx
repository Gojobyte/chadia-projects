import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmtMoney(n: number | null, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Page publique — pas d'auth requise
export default async function ResultatsPage({
  searchParams,
}: {
  searchParams: Promise<{ bailleurId?: string; secteur?: string }>;
}) {
  const { bailleurId, secteur } = await searchParams;

  const where: Record<string, unknown> = { estPublic: true };
  if (bailleurId || secteur) {
    where.appelOffre = {};
    if (bailleurId) (where.appelOffre as Record<string, unknown>).bailleurId = bailleurId;
    if (secteur) (where.appelOffre as Record<string, unknown>).secteur = secteur;
  }

  const [resultats, bailleurs] = await Promise.all([
    prisma.appelOffreResultat.findMany({
      where,
      include: {
        appelOffre: {
          select: {
            reference: true, titre: true, type: true, categorie: true, secteur: true,
            budgetEstime: true, devise: true, datePublication: true,
            bailleur: { select: { nom: true, sigle: true } },
          },
        },
      },
      orderBy: { publieAt: "desc" },
      take: 50,
    }),
    prisma.bailleur.findMany({ select: { id: true, sigle: true }, orderBy: { sigle: "asc" } }),
  ]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Resultats des marches publics</div>
          <div className="page-subtitle">Transparence et publication des resultats · {resultats.length} resultat{resultats.length > 1 ? "s" : ""} publie{resultats.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select name="bailleurId" defaultValue={bailleurId ?? ""} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text)" }}>
            <option value="">Tous les bailleurs</option>
            {bailleurs.map(b => <option key={b.id} value={b.id}>{b.sigle}</option>)}
          </select>
          <input
            type="text"
            name="secteur"
            defaultValue={secteur}
            placeholder="Secteur..."
            style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text)" }}
          />
          <button type="submit" className="btn btn-secondary btn-sm">Filtrer</button>
        </form>
      </div>

      {resultats.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          Aucun resultat publie pour le moment.
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
                    <span>{r.appelOffre.bailleur.sigle}</span>
                    <span>·</span>
                    <span>{r.appelOffre.categorie}</span>
                    {r.appelOffre.secteur && <><span>·</span><span>{r.appelOffre.secteur}</span></>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Publie le</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>{fmtDate(r.publieAt)}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Fournisseur retenu</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--success)" }}>{r.fournisseurRetenuNom ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Montant attribue</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(r.montantAttribue, r.devise)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Soumissions recues</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{r.nombreSoumissions}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>Budget initial</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(r.appelOffre.budgetEstime, r.appelOffre.devise)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
