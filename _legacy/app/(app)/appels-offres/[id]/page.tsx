import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publie", EN_COURS: "En cours",
  CLOTURE: "Cloture", EN_EVALUATION: "En evaluation", ATTRIBUE: "Attribue",
  ANNULE: "Annule", ARCHIVE: "Archive",
};

const soumissionStatutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", DEPOSEE: "Deposee", RECEVABLE: "Recevable",
  NON_RECEVABLE: "Non recevable", EN_EVALUATION: "En evaluation",
  RETENUE: "Retenue", REJETEE: "Rejetee", DESISTEE: "Desistee",
};

function fmtMoney(n: number | null, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function AppelOffreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const appelOffre = await prisma.appelOffre.findUnique({
    where: { id },
    include: {
      bailleur: true,
      soumissions: {
        include: {
          fournisseur: { select: { raisonSociale: true, sigle: true, statut: true } },
        },
        orderBy: { noteGlobale: "desc" },
      },
      resultats: true,
    },
  });

  if (!appelOffre) {
    return <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>Appel d&apos;offre non trouve.</div>;
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "monospace", marginBottom: 4 }}>{appelOffre.reference}</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{appelOffre.titre}</h1>
          <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--text-3)" }}>
            <span>{appelOffre.bailleur.nom}</span>
            <span>·</span>
            <span>{appelOffre.type.replace(/_/g, " ")}</span>
            <span>·</span>
            <span>{appelOffre.categorie}</span>
            {appelOffre.secteur && <><span>·</span><span>{appelOffre.secteur}</span></>}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 4, background: "var(--primary-soft)", color: "var(--primary)" }}>
          {statutLabels[appelOffre.statut]}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Budget estime</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(appelOffre.budgetEstime, appelOffre.devise)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Date limite</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{fmtDate(appelOffre.dateLimiteDepot)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Soumissions</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{appelOffre.soumissions.length}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Publication</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{fmtDate(appelOffre.datePublication)}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Description</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{appelOffre.description}</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
          Soumissions ({appelOffre.soumissions.length})
        </div>
        {appelOffre.soumissions.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>Aucune soumission pour le moment</div>
        ) : (
          <div>
            {appelOffre.soumissions.map((s, i) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: i === appelOffre.soumissions.length - 1 ? "none" : "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)" }}>{s.fournisseur.raisonSociale}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.numeroSoumission} · Note: {s.noteGlobale?.toFixed(1) ?? "—"}</div>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 3, background: s.statut === "RETENUE" ? "var(--success-soft)" : "var(--surface-2)", color: s.statut === "RETENUE" ? "var(--success)" : "var(--text-3)" }}>
                  {soumissionStatutLabels[s.statut] ?? s.statut}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {appelOffre.resultats && (
        <div className="card" style={{ padding: 16, marginTop: 16, border: "1px solid var(--success)", background: "var(--success-soft)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginBottom: 8 }}>Resultat</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Fournisseur retenu</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{appelOffre.resultats.fournisseurRetenuNom ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>Montant attribue</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{fmtMoney(appelOffre.resultats.montantAttribue, appelOffre.resultats.devise)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
