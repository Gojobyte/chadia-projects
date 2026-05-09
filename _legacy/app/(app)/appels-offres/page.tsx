import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publie",
  EN_COURS: "En cours",
  CLOTURE: "Cloture",
  EN_EVALUATION: "En evaluation",
  ATTRIBUE: "Attribue",
  ANNULE: "Annule",
  ARCHIVE: "Archive",
};

const statutColors: Record<string, string> = {
  BROUILLON: "var(--text-3)",
  PUBLIE: "var(--info)",
  EN_COURS: "var(--primary)",
  CLOTURE: "var(--warning)",
  EN_EVALUATION: "var(--secondary)",
  ATTRIBUE: "var(--success)",
  ANNULE: "var(--danger)",
  ARCHIVE: "var(--text-3)",
};

const typeLabels: Record<string, string> = {
  APPEL_OFFRES_OUVERT: "Appel d'offres ouvert",
  APPEL_OFFRES_RESTREINT: "Appel d'offres restreint",
  MARCHE_NEGOCIE: "Marche negocie",
  CONSULTATION: "Consultation",
  GRE_A_GRE: "Gre a gre",
};

const categorieLabels: Record<string, string> = {
  TRAVAUX: "Travaux",
  FOURNITURES: "Fournitures",
  SERVICES: "Services",
  MIXTE: "Mixte",
};

function fmtMoney(n: number | null, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(date: Date): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 864e5);
}

export default async function AppelsOffresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; categorie?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { q, statut, categorie, page: pageStr } = await searchParams;
  const page = parseInt(pageStr ?? "1");
  const limit = 12;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { titre: { contains: q, mode: "insensitive" } },
    ];
  }
  if (statut) where.statut = statut;
  if (categorie) where.categorie = categorie;

  const [appelsOffres, total, bailleurs] = await Promise.all([
    prisma.appelOffre.findMany({
      where,
      include: {
        bailleur: { select: { nom: true, sigle: true } },
        _count: { select: { soumissions: true } },
      },
      orderBy: { dateLimiteDepot: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appelOffre.count({ where }),
    prisma.bailleur.findMany({ select: { id: true, sigle: true }, orderBy: { sigle: "asc" } }),
  ]);

  const pages = Math.ceil(total / limit);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Appels d'offres</div>
          <div className="page-subtitle">{total} appel{total > 1 ? "s" : ""} d'offre{total > 1 ? "s" : ""} · {appelsOffres.filter(a => a.statut === "EN_COURS" || a.statut === "PUBLIE").length} ouvert{appelsOffres.filter(a => a.statut === "EN_COURS" || a.statut === "PUBLIE").length > 1 ? "s" : ""}</div>
        </div>
        <div className="page-actions">
          <Link href="/appels-offres/nouveau" className="btn btn-primary">
            + Nouvel appel d'offre
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Rechercher par reference ou titre..."
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

      {/* Liste */}
      {appelsOffres.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Aucun appel d'offre trouve</div>
          <Link href="/appels-offres/nouveau" style={{ color: "var(--primary)", fontSize: 13 }}>Creer le premier</Link>
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
                    {statutLabels[ao.statut]}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-3)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{ao.bailleur.sigle}</span>
                  <span>·</span>
                  <span>{categorieLabels[ao.categorie]}</span>
                  {ao.secteur && <><span>·</span><span>{ao.secteur}</span></>}
                </div>

                {ao.budgetEstime && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>
                    Budget: {fmtMoney(ao.budgetEstime, ao.devise)}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11.5, color: isUrgent ? "var(--warning)" : "var(--text-3)" }}>
                    {isClosed ? "Cloture" : `Limite: ${fmtDate(ao.dateLimiteDepot)}`}
                    {isUrgent && ` (J-${days})`}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                    {ao._count.soumissions} soumission{ao._count.soumissions > 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 20 }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}${q ? `&q=${q}` : ""}${statut ? `&statut=${statut}` : ""}${categorie ? `&categorie=${categorie}` : ""}`}
              className="btn btn-sm"
              style={p === page ? { background: "var(--primary)", color: "white" } : {}}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
