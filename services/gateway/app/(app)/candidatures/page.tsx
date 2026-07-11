import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Bailleur {
  nom: string;
  sigle: string;
}

interface Opportunite {
  id: string;
  titre: string;
  dateLimiteDepot?: string | null;
  sourceConnector: string;
  bailleur?: Bailleur | null;
}

interface Candidature {
  id: string;
  reference: string;
  titre: string;
  statut: "BROUILLON" | "EN_REDACTION" | "EN_VALIDATION" | "SOUMISE" | "ATTRIBUEE" | "NON_RETENUE" | "ABANDONNEE";
  budgetDemande?: number | null;
  devise: string;
  coordinateurId?: string | null;
  dateDepotPrevu?: string | null;
  dateDepotEffectif?: string | null;
  opportunite?: Opportunite | null;
  _count?: { documents: number };
  updatedAt: string;
}

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon", EN_REDACTION: "En rédaction",
  EN_VALIDATION: "En validation", SOUMISE: "Soumise",
  ATTRIBUEE: "Attribuée", NON_RETENUE: "Non retenue",
  ABANDONNEE: "Abandonnée",
};

const STATUT_TONE: Record<string, string> = {
  BROUILLON: "var(--color-mineral)",
  EN_REDACTION: "var(--color-terracotta)",
  EN_VALIDATION: "var(--color-warning)",
  SOUMISE: "var(--color-info)",
  ATTRIBUEE: "var(--color-success)",
  NON_RETENUE: "var(--color-shale)",
  ABANDONNEE: "var(--color-shale)",
};

function fmtMoney(n: number | null | undefined, cur = "EUR"): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M ${cur}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k ${cur}`;
  return `${n} ${cur}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default async function CandidaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  // ADMIN/DIRECTEUR/FINANCIER peuvent créer une candidature (la création
  // se fait toujours depuis une opportunité, donc on redirige sur /opportunites).
  const role = session.user.role;
  const canCreate = role === "ADMIN" || role === "DIRECTEUR" || role === "FINANCIER";

  const { statut, q } = await searchParams;
  const params: Record<string, string> = {};
  if (statut) params.statut = statut;
  if (q) params.q = q;

  let candidatures: Candidature[] = [];
  let total = 0;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listCandidatures(params, token);
    candidatures = data.candidatures ?? [];
    total = data.total ?? 0;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const counters = candidatures.reduce<Record<string, number>>((acc, c) => {
    acc[c.statut] = (acc[c.statut] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Pipeline de candidature · {total} dossier{total > 1 ? "s" : ""}</div>
          <h1 className="pg-title">
            Candidatures aux <em>bailleurs.</em>
          </h1>
          <p className="pg-sub">
            Dossiers que CHADIA monte pour répondre aux appels à propositions des financeurs internationaux.
            Chaque candidature regroupe la note conceptuelle, l&apos;équipe, le budget et les pièces administratives.
          </p>
        </div>
        {canCreate ? (
          <div className="pg-actions">
            <Link href="/opportunites" className="btn btn--secondary btn--sm">
              <i className="ph ph-binoculars" aria-hidden="true"></i> Choisir une opportunité
            </Link>
            <Link href="/opportunites?candidater=1" className="btn btn--accent btn--sm" title="Crée la candidature depuis l'opportunité sélectionnée">
              <i className="ph ph-plus" aria-hidden="true"></i> Nouvelle candidature
            </Link>
          </div>
        ) : null}
      </header>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      <div className="sm-pipe">
        <Link href="/candidatures" className={`col ${!statut ? "on" : ""}`}>
          <div className="l"><span className="dot" style={{ background: "var(--color-mineral)" }}></span> Toutes</div>
          <div className="v">{total}</div>
          <div className="d">Pipeline complet</div>
        </Link>
        <Link href="/candidatures?statut=EN_REDACTION" className={`col ${statut === "EN_REDACTION" ? "on" : ""}`}>
          <div className="l"><span className="dot" style={{ background: STATUT_TONE.EN_REDACTION }}></span> En rédaction</div>
          <div className="v">{counters.EN_REDACTION ?? 0}</div>
          <div className="d">Dossiers en cours</div>
        </Link>
        <Link href="/candidatures?statut=EN_VALIDATION" className={`col ${statut === "EN_VALIDATION" ? "on" : ""}`}>
          <div className="l"><span className="dot" style={{ background: STATUT_TONE.EN_VALIDATION }}></span> En validation</div>
          <div className="v">{counters.EN_VALIDATION ?? 0}</div>
          <div className="d">Relecture interne</div>
        </Link>
        <Link href="/candidatures?statut=SOUMISE" className={`col ${statut === "SOUMISE" ? "on" : ""}`}>
          <div className="l"><span className="dot" style={{ background: STATUT_TONE.SOUMISE }}></span> Soumises</div>
          <div className="v">{counters.SOUMISE ?? 0}</div>
          <div className="d">Envoyées au bailleur</div>
        </Link>
        <Link href="/candidatures?statut=ATTRIBUEE" className={`col ${statut === "ATTRIBUEE" ? "on" : ""}`}>
          <div className="l"><span className="dot" style={{ background: STATUT_TONE.ATTRIBUEE }}></span> Attribuées</div>
          <div className="v">{counters.ATTRIBUEE ?? 0}</div>
          <div className="d">Financement obtenu</div>
        </Link>
      </div>

      {candidatures.length === 0 ? (
        <div className="empty" style={{ marginTop: 32 }}>
          <div className="ic"><i className="ph ph-folder-notch-open" aria-hidden="true"></i></div>
          <h3 className="t">Aucune <em>candidature</em> pour l&apos;instant</h3>
          <p className="s">
            {statut
              ? "Aucune candidature ne correspond à ce filtre."
              : "Repérez une opportunité dans la veille bailleurs puis cliquez sur \"Démarrer une candidature\" pour ouvrir le dossier ici."}
          </p>
          <Link href="/opportunites" className="btn btn--primary">
            <i className="ph ph-binoculars" aria-hidden="true"></i> Voir les opportunités
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
          {candidatures.map((c) => {
            const bailleur = c.opportunite?.bailleur;
            return (
              <Link
                key={c.id}
                href={`/candidatures/${c.id}`}
                className="card"
                style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, textDecoration: "none", color: "inherit" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{c.reference}</span>
                    {bailleur && <><span>·</span><span>{bailleur.sigle}</span></>}
                    {c._count?.documents !== undefined && (
                      <><span>·</span><span>{c._count.documents} pièce{c._count.documents > 1 ? "s" : ""}</span></>
                    )}
                  </div>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, lineHeight: 1.3, color: "var(--color-ink)" }}>
                    {c.titre}
                  </h3>
                  <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--color-shale)" }}>
                    <span><i className="ph ph-coins" aria-hidden="true"></i> {fmtMoney(c.budgetDemande, c.devise)}</span>
                    {c.dateDepotPrevu && (
                      <span><i className="ph ph-clock-countdown" aria-hidden="true"></i> Dépôt prévu {fmtDate(c.dateDepotPrevu)}</span>
                    )}
                    {c.dateDepotEffectif && (
                      <span style={{ color: "var(--color-success)" }}><i className="ph ph-check-circle" aria-hidden="true"></i> Déposée {fmtDate(c.dateDepotEffectif)}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      padding: "3px 10px",
                      borderRadius: 3,
                      background: STATUT_TONE[c.statut],
                      color: "white",
                    }}
                  >
                    {STATUT_LABEL[c.statut]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
