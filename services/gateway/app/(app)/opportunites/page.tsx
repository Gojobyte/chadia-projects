import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

interface Bailleur {
  nom: string;
  sigle: string;
  logoUrl?: string | null;
}

interface Candidature {
  id: string;
  reference: string;
  statut: string;
}

interface Opportunite {
  id: string;
  titre: string;
  description?: string | null;
  sourceConnector: "TED" | "SAM_GOV" | "WORLDBANK" | "RELIEFWEB" | "UNGM" | "BAD" | "AFD" | "ECHO" | "USAID" | "MANUEL" | "AUTRE";
  sourceUrl?: string | null;
  bailleurId?: string | null;
  bailleur?: Bailleur | null;
  bailleurNom?: string | null;
  secteur?: string | null;
  typeFinancement: string;
  paysCible: string[];
  region?: string | null;
  montantEstime?: number | null;
  devise: string;
  datePublication?: string | null;
  dateLimiteDepot?: string | null;
  statut: "NOUVELLE" | "A_ETUDIER" | "IGNOREE" | "CANDIDATEE" | "EXPIREE";
  tags: string[];
  collecteAt: string;
  candidature?: Candidature | null;
}

// ---------------------------------------------------------------------
// Constantes d'affichage
// ---------------------------------------------------------------------
const STATUT_META: Record<string, { label: string; color: string; bg: string }> = {
  NOUVELLE:   { label: "Nouvelle",     color: "#0c4a6e", bg: "#bae6fd" },
  A_ETUDIER:  { label: "À étudier",    color: "#7c2d12", bg: "#fed7aa" },
  IGNOREE:    { label: "Ignorée",      color: "#52525b", bg: "#e4e4e7" },
  CANDIDATEE: { label: "Candidatée",   color: "#14532d", bg: "#bbf7d0" },
  EXPIREE:    { label: "Expirée",      color: "#71717a", bg: "#f4f4f5" },
};

const SOURCE_META: Record<string, { label: string; tone: string }> = {
  TED:       { label: "TED · UE",          tone: "#1e40af" },
  SAM_GOV:   { label: "Sam.gov · USA",     tone: "#b91c1c" },
  WORLDBANK: { label: "Banque Mondiale",   tone: "#15803d" },
  RELIEFWEB: { label: "ReliefWeb · ONU",   tone: "#0e7490" },
  UNGM:      { label: "UN Global",         tone: "#0369a1" },
  BAD:       { label: "BAD",               tone: "#7c2d12" },
  AFD:       { label: "AFD",               tone: "#1e3a8a" },
  ECHO:      { label: "ECHO · UE",         tone: "#1e40af" },
  USAID:     { label: "USAID",             tone: "#b91c1c" },
  MANUEL:    { label: "Saisie manuelle",   tone: "#52525b" },
  AUTRE:     { label: "Autre",             tone: "#52525b" },
};

const TYPE_LABEL: Record<string, string> = {
  SUBVENTION:           "Subvention",
  MARCHE_SERVICE:       "Marché services",
  MARCHE_TRAVAUX:       "Marché travaux",
  MARCHE_FOURNITURES:   "Marché fournitures",
  CONSULTATION:         "Consultation",
  ASSISTANCE_TECHNIQUE: "Assistance technique",
  AUTRE:                "Autre",
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function fmtMoney(n: number | null | undefined, cur = "EUR"): { val: string; unit: string } {
  if (n == null) return { val: "—", unit: "" };
  if (n >= 1_000_000_000) return { val: (n / 1_000_000_000).toFixed(1), unit: `Md ${cur}` };
  if (n >= 1_000_000)     return { val: Math.round(n / 1_000_000).toString(), unit: `M ${cur}` };
  if (n >= 1_000)         return { val: Math.round(n / 1_000).toString(), unit: `k ${cur}` };
  return { val: String(n), unit: cur };
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function deadlineState(date: string | null | undefined): {
  daysLeft: number | null;
  label: string;
  tone: "ok" | "warn" | "urgent" | "past" | "none";
  color: string;
  bg: string;
} {
  if (!date) return { daysLeft: null, label: "Date à confirmer", tone: "none", color: "#71717a", bg: "transparent" };
  const ms = new Date(date).getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0)  return { daysLeft: days, label: `Clos il y a ${-days}j`, tone: "past",   color: "#71717a", bg: "#f4f4f5" };
  if (days <= 7) return { daysLeft: days, label: `${days}j restants`,     tone: "urgent", color: "#7f1d1d", bg: "#fecaca" };
  if (days <= 30)return { daysLeft: days, label: `${days}j restants`,     tone: "warn",   color: "#854d0e", bg: "#fef08a" };
  return         { daysLeft: days, label: `${days}j restants`,     tone: "ok",     color: "#14532d", bg: "#bbf7d0" };
}

// ---------------------------------------------------------------------
// Server Action — sync TED + Sam.gov + WorldBank
// ---------------------------------------------------------------------
async function syncAllAction() {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR") {
    throw new Error("Seuls ADMIN et DIRECTEUR peuvent lancer la veille.");
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  let summary = "";
  try {
    const data = await TenderAPI.syncOpportunites("ALL", token);
    const t = data?.totals ?? { fetched: 0, created: 0, updated: 0 };
    const sources = (data?.reports ?? []).map((r: { connector: string; counts?: { created?: number; updated?: number } }) =>
      `${r.connector}=${r.counts?.created ?? 0}+${r.counts?.updated ?? 0}`
    ).join(", ");
    summary = `${t.fetched} ramenées, ${t.created} nouvelles, ${t.updated} màj · ${sources}`;
  } catch (e) {
    summary = `Erreur · ${e instanceof Error ? e.message : "inconnue"}`;
  }
  revalidatePath("/opportunites");
  redirect(`/opportunites?sync=${encodeURIComponent(summary)}`);
}

// ---------------------------------------------------------------------
export default async function OpportunitesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; source?: string; q?: string; sync?: string; tri?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const { statut, source, q, sync, tri } = await searchParams;
  const canSync = session.user.role === "ADMIN" || session.user.role === "DIRECTEUR";

  const params: Record<string, string> = { limit: "100" };
  if (statut) params.statut = statut;
  if (source) params.source = source;
  if (q) params.q = q;

  let all: Opportunite[] = [];
  let total = 0;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listOpportunites(params, token);
    all = data.opportunites ?? [];
    total = data.total ?? all.length;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  // Tri (par défaut : deadline ASC pour les ouvertes, puis par date publication DESC)
  const sortMode = tri ?? "deadline";
  const sorted = [...all].sort((a, b) => {
    if (sortMode === "deadline") {
      const da = a.dateLimiteDepot ? new Date(a.dateLimiteDepot).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.dateLimiteDepot ? new Date(b.dateLimiteDepot).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    }
    if (sortMode === "recent") {
      const da = a.datePublication ? new Date(a.datePublication).getTime() : 0;
      const db = b.datePublication ? new Date(b.datePublication).getTime() : 0;
      return db - da;
    }
    return 0;
  });

  // Compteurs par statut et par source pour les filtres
  const countStatut = sorted.reduce<Record<string, number>>((acc, o) => {
    acc[o.statut] = (acc[o.statut] ?? 0) + 1;
    return acc;
  }, {});
  const countSource = sorted.reduce<Record<string, number>>((acc, o) => {
    acc[o.sourceConnector] = (acc[o.sourceConnector] ?? 0) + 1;
    return acc;
  }, {});

  // KPIs en haut. Par défaut le backend renvoie déjà SANS les expirées ni
  // les ignorées : ce qu'on voit = ce sur quoi CHADIA peut encore agir.
  const urgentes = sorted.filter((o) => {
    if (!o.dateLimiteDepot) return false;
    const d = deadlineState(o.dateLimiteDepot);
    return d.tone === "urgent";
  }).length;
  const avecDeadline = sorted.filter((o) => !!o.dateLimiteDepot).length;

  return (
    <div className="pg">
      {/* ============ EN-TÊTE ============ */}
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Veille bailleurs internationaux · Tchad</div>
          <h1 className="pg-title">
            {total} <em>opportunité{total > 1 ? "s" : ""}</em> en cours.
          </h1>
          <p className="pg-sub">
            Appels à propositions et marchés publics ramenés automatiquement de l&apos;Union européenne (<strong>TED</strong>),
            du gouvernement américain (<strong>Sam.gov</strong>), et de la <strong>Banque mondiale</strong>.
            Filtres actifs : publié en 2026, date limite renseignée, statut actif.
          </p>
        </div>
        <div className="pg-actions">
          {canSync && (
            <form action={syncAllAction}>
              <button type="submit" className="btn btn--secondary btn--sm" title="Interroger TED + Sam.gov + Banque Mondiale">
                <i className="ph ph-arrow-clockwise"></i> Synchroniser
              </button>
            </form>
          )}
          <Link href="/opportunites/nouveau" className="btn btn--accent btn--sm">
            <i className="ph ph-plus"></i> Saisir manuellement
          </Link>
        </div>
      </header>

      {/* ============ BANNIÈRE DE SYNC ============ */}
      {sync && (
        <div
          className="card"
          style={{
            padding: 14,
            marginTop: 16,
            background: sync.includes("Erreur") ? "var(--color-danger-soft)" : "var(--color-success-soft)",
            borderColor: sync.includes("Erreur") ? "rgba(163,45,45,0.18)" : "rgba(58,124,89,0.18)",
            fontSize: 13,
          }}
        >
          <i className={`ph ${sync.includes("Erreur") ? "ph-warning" : "ph-check-circle"}`}></i>{" "}
          <strong>Synchronisation :</strong> {decodeURIComponent(sync)}
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      {/* ============ KPIs ============ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 24 }}>
        <Kpi label="En cours" value={String(total)} sub="visibles dans la veille" tone="ink" />
        <Kpi label="Avec échéance" value={String(avecDeadline)} sub="date limite renseignée" tone="info" />
        <Kpi label="Urgentes" value={String(urgentes)} sub="moins de 7 jours" tone={urgentes > 0 ? "warning" : "mineral"} />
        <Kpi label="Candidatées" value={String(countStatut.CANDIDATEE ?? 0)} sub="dossier en cours" tone="success" />
      </div>

      {/* ============ FILTRES ============ */}
      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Statut */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 10px", background: "var(--color-canvas)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
          <span style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>Statut</span>
        </div>
        {[
          { v: "", l: "En cours", n: total, showCount: true },
          { v: "NOUVELLE", l: "Nouvelles", n: countStatut.NOUVELLE ?? 0, showCount: true },
          { v: "A_ETUDIER", l: "À étudier", n: countStatut.A_ETUDIER ?? 0, showCount: true },
          { v: "CANDIDATEE", l: "Candidatées", n: countStatut.CANDIDATEE ?? 0, showCount: true },
          // Ces statuts sont filtrés par défaut, on ne connaît pas leur compte
          // depuis la liste actuelle — on n'affiche pas de chiffre pour ne pas tromper.
          { v: "IGNOREE", l: "Ignorées", n: countStatut.IGNOREE ?? 0, showCount: statut === "IGNOREE" },
          { v: "EXPIREE", l: "Expirées", n: countStatut.EXPIREE ?? 0, showCount: statut === "EXPIREE" },
        ].map((f) => {
          const isActive = (statut ?? "") === f.v;
          const href = "/opportunites" + (f.v ? `?statut=${f.v}` : "") + (source ? `${f.v ? "&" : "?"}source=${source}` : "");
          return (
            <Link
              key={f.v || "all"}
              href={href}
              className={`pill ${isActive ? "on" : ""}`}
              style={{
                padding: "5px 12px", borderRadius: 4, fontSize: 12,
                background: isActive ? "var(--color-ink)" : "var(--color-surface)",
                color: isActive ? "white" : "var(--color-ink)",
                border: "1px solid var(--color-line)", textDecoration: "none",
              }}
            >
              {f.l}{f.showCount && <span style={{ opacity: 0.6, marginLeft: 4 }}>{f.n}</span>}
            </Link>
          );
        })}

        <span style={{ flex: 1 }}></span>

        {/* Tri */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
          <span style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>Trier</span>
        </div>
        {[
          { v: "deadline", l: "Par échéance" },
          { v: "recent", l: "Plus récentes" },
        ].map((t) => {
          const isActive = (sortMode ?? "deadline") === t.v;
          const search = new URLSearchParams();
          if (statut) search.set("statut", statut);
          if (source) search.set("source", source);
          search.set("tri", t.v);
          return (
            <Link
              key={t.v}
              href={`/opportunites?${search.toString()}`}
              style={{
                padding: "5px 12px", borderRadius: 4, fontSize: 12,
                background: isActive ? "var(--color-terracotta-soft)" : "transparent",
                color: isActive ? "var(--color-terracotta)" : "var(--color-stone)",
                border: "1px solid var(--color-line)", textDecoration: "none",
              }}
            >
              {t.l}
            </Link>
          );
        })}
      </div>

      {/* Filtres source si on a plus d'1 source */}
      {Object.keys(countSource).length > 1 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 10px", background: "var(--color-canvas)", borderRadius: 4 }}>
            Source
          </div>
          {[
            { v: "", l: "Toutes", n: total, tone: "#52525b" },
            ...Object.entries(countSource).map(([k, n]) => ({
              v: k, l: SOURCE_META[k]?.label ?? k, n, tone: SOURCE_META[k]?.tone ?? "#52525b",
            })),
          ].map((f) => {
            const isActive = (source ?? "") === f.v;
            const search = new URLSearchParams();
            if (statut) search.set("statut", statut);
            if (f.v) search.set("source", f.v);
            if (tri) search.set("tri", tri);
            const href = `/opportunites${search.toString() ? "?" + search.toString() : ""}`;
            return (
              <Link
                key={f.v || "all"}
                href={href}
                style={{
                  padding: "4px 10px", borderRadius: 4, fontSize: 11, fontFamily: "var(--font-mono)",
                  border: `1px solid ${isActive ? f.tone : "var(--color-line)"}`,
                  background: isActive ? f.tone : "var(--color-surface)",
                  color: isActive ? "white" : f.tone,
                  textDecoration: "none",
                }}
              >
                {f.l} <span style={{ opacity: 0.7, marginLeft: 4 }}>{f.n}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ============ LISTE ============ */}
      {sorted.length === 0 ? (
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="ic"><i className="ph ph-binoculars"></i></div>
          <h3 className="t">Aucune <em>opportunité</em> pour ce filtre</h3>
          <p className="s">
            Lancez la synchronisation pour rafraîchir la veille, ou élargissez vos critères.
          </p>
          {canSync && (
            <form action={syncAllAction}>
              <button type="submit" className="btn btn--primary">
                <i className="ph ph-arrow-clockwise"></i> Synchroniser maintenant
              </button>
            </form>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
          {sorted.map((o) => <OpportunityCard key={o.id} o={o} />)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Composant KPI
// ---------------------------------------------------------------------
function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "ink" | "info" | "warning" | "success" | "mineral" }) {
  const TONE_BG: Record<string, string> = {
    ink: "var(--color-canvas)",
    info: "var(--color-info-soft, #e0f2fe)",
    warning: "var(--color-warning-soft, #fef9c3)",
    success: "var(--color-success-soft, #dcfce7)",
    mineral: "var(--color-canvas)",
  };
  const TONE_COLOR: Record<string, string> = {
    ink: "var(--color-ink)",
    info: "#0369a1",
    warning: "#92400e",
    success: "#15803d",
    mineral: "var(--color-stone)",
  };
  return (
    <div style={{ padding: "16px 18px", background: TONE_BG[tone], border: "1px solid var(--color-line)", borderRadius: 6 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-stone)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 400, color: TONE_COLOR[tone], lineHeight: 1.1, marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--color-shale)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Composant Card d'opportunité
// ---------------------------------------------------------------------
function OpportunityCard({ o }: { o: Opportunite }) {
  const cd = deadlineState(o.dateLimiteDepot);
  const money = fmtMoney(o.montantEstime, o.devise);
  const stMeta = STATUT_META[o.statut] ?? STATUT_META.NOUVELLE;
  const srcMeta = SOURCE_META[o.sourceConnector] ?? SOURCE_META.AUTRE;
  const bailleurLabel = o.bailleur?.sigle ?? o.bailleur?.nom ?? o.bailleurNom ?? "Bailleur non identifié";
  const onlyChad = o.paysCible.length === 1 && o.paysCible[0] === "TCD";

  return (
    <Link
      href={`/opportunites/${o.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "8px 1fr 180px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: 6,
        textDecoration: "none",
        color: "inherit",
        overflow: "hidden",
        transition: "all 0.15s",
      }}
    >
      {/* Barre couleur source */}
      <div style={{ background: srcMeta.tone }}></div>

      {/* Corps principal */}
      <div style={{ padding: "16px 20px", minWidth: 0 }}>
        {/* Top row: source + bailleur + secteur + multi-pays */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)", fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "3px 8px", borderRadius: 3,
              background: srcMeta.tone, color: "white",
            }}
          >
            {srcMeta.label}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
            {bailleurLabel}
          </span>
          {o.secteur && (
            <>
              <span style={{ color: "var(--color-shale)" }}>·</span>
              <span style={{ fontSize: 12, color: "var(--color-stone)" }}>{o.secteur}</span>
            </>
          )}
          {!onlyChad && o.paysCible.length > 1 && (
            <span
              title={`Couvre ${o.paysCible.length} pays`}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                padding: "2px 7px", borderRadius: 3,
                background: "#fef3c7", color: "#92400e",
              }}
            >
              <i className="ph ph-globe"></i> {o.paysCible.length} pays
            </span>
          )}
        </div>

        {/* Titre */}
        <h3 style={{
          margin: 0,
          fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400,
          lineHeight: 1.35, color: "var(--color-ink)",
        }}>
          {o.titre}
        </h3>

        {/* Description courte */}
        {o.description && (
          <p style={{
            margin: "8px 0 0", fontSize: 13, color: "var(--color-sepia)",
            lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {o.description}
          </p>
        )}

        {/* Footer : type financement + montant + candidature liée */}
        <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: "var(--color-shale)" }}>
          <span>
            <i className="ph ph-tag"></i> {TYPE_LABEL[o.typeFinancement] ?? o.typeFinancement}
          </span>
          {o.montantEstime != null && (
            <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>
              <i className="ph ph-coins"></i> <strong>{money.val}</strong> <em style={{ fontStyle: "normal", color: "var(--color-stone)" }}>{money.unit}</em>
            </span>
          )}
          {o.datePublication && (
            <span>
              <i className="ph ph-calendar-blank"></i> Publié le {fmtDate(o.datePublication)}
            </span>
          )}
          {o.candidature && (
            <span style={{ color: "#15803d", fontWeight: 500 }}>
              <i className="ph ph-folder-notch-open"></i> Candidature {o.candidature.reference} · {o.candidature.statut}
            </span>
          )}
        </div>
      </div>

      {/* Colonne droite : deadline + statut */}
      <div style={{
        padding: "16px 20px", borderLeft: "1px solid var(--color-line)",
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        justifyContent: "space-between", gap: 10,
        background: "var(--color-canvas)",
      }}>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.06em",
            color: "var(--color-stone)", marginBottom: 4,
          }}>
            Date limite
          </div>
          <div style={{ fontSize: 13, color: "var(--color-ink)" }}>
            {fmtDate(o.dateLimiteDepot)}
          </div>
          {cd.daysLeft != null && (
            <div style={{
              marginTop: 6, display: "inline-block",
              padding: "3px 10px", borderRadius: 3,
              background: cd.bg, color: cd.color,
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
            }}>
              {cd.label}
            </div>
          )}
        </div>

        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.06em",
          padding: "4px 10px", borderRadius: 3,
          background: stMeta.bg, color: stMeta.color, fontWeight: 600,
        }}>
          {stMeta.label}
        </span>
      </div>
    </Link>
  );
}
