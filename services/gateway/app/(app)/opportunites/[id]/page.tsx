import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";
import { RichDescription } from "@/components/RichDescription";

interface Bailleur {
  id: string;
  nom: string;
  sigle: string;
  siteWeb?: string | null;
}

interface Candidature {
  id: string;
  reference: string;
  statut: string;
}

interface Doc {
  id: string;
  nom: string;
  originalName?: string | null;
  type: string;
  category: string;
  visibility: "PUBLIC" | "INTERNE" | "CONFIDENTIEL";
  mimeType?: string | null;
  taille?: number | null;
  url: string;
  version?: string | null;
  tags: string[];
  isPinned: boolean;
  description?: string | null;
  createdAt: string;
  uploadedBy?: string | null;
}

type SourceKey = "TED" | "SAM_GOV" | "WORLDBANK" | "RELIEFWEB" | "UNGM" | "BAD" | "AFD" | "ECHO" | "USAID" | "MANUEL" | "AUTRE";

interface Opportunite {
  id: string;
  titre: string;
  description?: string | null;
  sourceConnector: SourceKey;
  sourceId?: string | null;
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
  decideePar?: string | null;
  decideeAt?: string | null;
  candidature?: Candidature | null;
  documents?: Doc[];
  rawPayload?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------
// Constantes UI
// ---------------------------------------------------------------------
const STATUT_META: Record<string, { label: string; color: string; bg: string }> = {
  NOUVELLE:   { label: "Nouvelle",   color: "#0c4a6e", bg: "#bae6fd" },
  A_ETUDIER:  { label: "À étudier",  color: "#7c2d12", bg: "#fed7aa" },
  IGNOREE:    { label: "Ignorée",    color: "#52525b", bg: "#e4e4e7" },
  CANDIDATEE: { label: "Candidatée", color: "#14532d", bg: "#bbf7d0" },
  EXPIREE:    { label: "Expirée",    color: "#71717a", bg: "#f4f4f5" },
};

const SOURCE_META: Record<SourceKey, { label: string; tone: string; description: string }> = {
  TED:       { label: "TED · Union européenne",         tone: "#1e40af", description: "Tenders Electronic Daily — journal officiel des marchés publics de l'UE." },
  SAM_GOV:   { label: "Sam.gov · États-Unis",           tone: "#b91c1c", description: "System for Award Management — toutes les agences fédérales US (USAID, État, MCC…)." },
  WORLDBANK: { label: "Banque Mondiale",                tone: "#15803d", description: "Procurement Notices — marchés issus des projets financés par la Banque mondiale au Tchad." },
  RELIEFWEB: { label: "ReliefWeb · OCHA",               tone: "#0e7490", description: "Plateforme humanitaire des Nations Unies." },
  UNGM:      { label: "UN Global Marketplace",          tone: "#0369a1", description: "Marketplace inter-agences des Nations Unies." },
  BAD:       { label: "Banque africaine de développement", tone: "#7c2d12", description: "Marchés financés par la BAD." },
  AFD:       { label: "Agence française de développement", tone: "#1e3a8a", description: "Marchés financés par l'AFD." },
  ECHO:      { label: "DG ECHO · UE",                   tone: "#1e40af", description: "Direction générale de l'aide humanitaire de la Commission européenne." },
  USAID:     { label: "USAID",                          tone: "#b91c1c", description: "Agence américaine pour le développement international." },
  MANUEL:    { label: "Saisie manuelle",                tone: "#52525b", description: "Opportunité saisie à la main par un membre CHADIA." },
  AUTRE:     { label: "Autre source",                   tone: "#52525b", description: "Source non classifiée." },
};

const TYPE_LABEL: Record<string, string> = {
  SUBVENTION:           "Subvention (appel à propositions)",
  MARCHE_SERVICE:       "Marché de services",
  MARCHE_TRAVAUX:       "Marché de travaux",
  MARCHE_FOURNITURES:   "Marché de fournitures",
  CONSULTATION:         "Consultation",
  ASSISTANCE_TECHNIQUE: "Assistance technique",
  AUTRE:                "Autre",
};

// Codes de langue DeepL (BCP-47 abrégé) → libellé français
const LANG_LABEL: Record<string, string> = {
  EN: "anglais", FR: "français", DE: "allemand", ES: "espagnol", IT: "italien",
  PT: "portugais", NL: "néerlandais", PL: "polonais", RU: "russe",
  AR: "arabe", ZH: "chinois", JA: "japonais", TR: "turc", SV: "suédois",
  DA: "danois", FI: "finnois", NO: "norvégien", CS: "tchèque", HU: "hongrois",
};

const PAYS_LABEL: Record<string, string> = {
  TCD: "Tchad", NER: "Niger", SDN: "Soudan", LBY: "Libye",
  CMR: "Cameroun", NGA: "Nigéria", CAF: "RCA", MLI: "Mali",
  BFA: "Burkina Faso", SEN: "Sénégal", MRT: "Mauritanie", BEN: "Bénin",
  TGO: "Togo", CIV: "Côte d'Ivoire", GIN: "Guinée", FRA: "France",
  USA: "États-Unis", GBR: "Royaume-Uni", DEU: "Allemagne", BEL: "Belgique",
  CHE: "Suisse", ITA: "Italie", ESP: "Espagne", NLD: "Pays-Bas",
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function fmtMoney(n: number | null | undefined, cur = "EUR"): string {
  if (n == null) return "Montant non précisé";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDaysUntil(d: string | null | undefined): { label: string; color: string; bg: string } | null {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0)  return { label: `Échéance dépassée il y a ${-days} jours`, color: "#71717a", bg: "#f4f4f5" };
  if (days <= 7) return { label: `Plus que ${days} jour${days > 1 ? "s" : ""} avant clôture`, color: "#7f1d1d", bg: "#fecaca" };
  if (days <= 30)return { label: `${days} jours restants`, color: "#854d0e", bg: "#fef08a" };
  return         { label: `${days} jours restants`, color: "#14532d", bg: "#bbf7d0" };
}
function paysLabel(code: string): string {
  return PAYS_LABEL[code] ?? code;
}

// ---------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------
async function decideAction(id: string, newStatut: "A_ETUDIER" | "IGNOREE" | "NOUVELLE") {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");
  await TenderAPI.patchOpportunite(id, { statut: newStatut }, token);
  revalidatePath(`/opportunites/${id}`);
  revalidatePath("/opportunites");
}

async function startCandidatureAction(opportuniteId: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const oppData = await TenderAPI.getOpportunite(opportuniteId, token);
  const opp = oppData.opportunite;

  const data = await TenderAPI.createCandidature({
    opportuniteId,
    titre: opp.titre,
    description: opp.description ?? null,
    budgetDemande: opp.montantEstime ?? null,
    devise: opp.devise ?? "EUR",
    dateDepotPrevu: opp.dateLimiteDepot ?? null,
    statut: "BROUILLON",
  }, token);

  revalidatePath("/opportunites");
  revalidatePath("/candidatures");
  redirect(`/candidatures/${data.candidature.id}`);
}

// ---------------------------------------------------------------------
export default async function OpportuniteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const { id } = await params;
  let opp: Opportunite | null = null;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.getOpportunite(id, token);
    opp = data.opportunite ?? null;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  if (errorMsg || !opp) {
    return (
      <div className="empty">
        <div className="ic"><i className="ph ph-warning-octagon"></i></div>
        <h3 className="t">Opportunité <em>introuvable</em></h3>
        <p className="s">{errorMsg ?? "Cet identifiant ne correspond à aucune opportunité."}</p>
        <Link href="/opportunites" className="btn btn--secondary">Retour à la veille</Link>
      </div>
    );
  }

  const canDecide = session.user.role === "ADMIN" || session.user.role === "DIRECTEUR" || session.user.role === "FINANCIER";
  const canCandidater = canDecide && !opp.candidature && opp.statut !== "EXPIREE";
  const stMeta = STATUT_META[opp.statut] ?? STATUT_META.NOUVELLE;
  const srcMeta = SOURCE_META[opp.sourceConnector] ?? SOURCE_META.AUTRE;
  const bailleurLabel = opp.bailleur?.sigle ?? opp.bailleur?.nom ?? opp.bailleurNom ?? "Bailleur non identifié";
  const cd = fmtDaysUntil(opp.dateLimiteDepot);

  const setEtudier = decideAction.bind(null, opp.id, "A_ETUDIER");
  const setIgnoree = decideAction.bind(null, opp.id, "IGNOREE");
  const reset = decideAction.bind(null, opp.id, "NOUVELLE");
  const startCand = startCandidatureAction.bind(null, opp.id);

  // Extraction de contacts depuis le payload brut (Sam.gov & Banque Mondiale exposent un contact)
  const raw = (opp.rawPayload ?? {}) as Record<string, unknown>;
  const contact = extractContact(opp.sourceConnector, raw);

  return (
    <div className="pg">
      {/* ============ BARRE COULEUR SOURCE ============ */}
      <div style={{ height: 4, background: srcMeta.tone, margin: "-24px -24px 0", borderTopLeftRadius: 4, borderTopRightRadius: 4 }}></div>

      {/* ============ EN-TÊTE ============ */}
      <header style={{ marginTop: 24, paddingBottom: 20, borderBottom: "1px solid var(--color-line)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <Link href="/opportunites" style={{ color: "var(--color-stone)", textDecoration: "none", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <i className="ph ph-arrow-left"></i> Veille bailleurs
          </Link>
          <span style={{ color: "var(--color-shale)" }}>·</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "3px 8px", borderRadius: 3,
            background: srcMeta.tone, color: "white",
          }}>
            {srcMeta.label}
          </span>
          {opp.sourceId && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
              · réf. <strong>{opp.sourceId}</strong>
            </span>
          )}
          <span style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.06em",
            padding: "4px 10px", borderRadius: 3,
            background: stMeta.bg, color: stMeta.color, fontWeight: 600,
          }}>
            {stMeta.label}
          </span>
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400,
          lineHeight: 1.25, margin: 0, color: "var(--color-ink)",
          letterSpacing: "var(--tracking-tight)",
        }}>
          {opp.titre}
        </h1>

        {/* Badge "traduit du …" si la traduction a été appliquée */}
        {(() => {
          const meta = (opp.rawPayload as { _chadia?: { translated?: boolean; langueOriginale?: string; provider?: string } } | undefined)?._chadia;
          if (!meta?.translated) return null;
          const lang = (meta.langueOriginale || "").toUpperCase();
          const langLabel = LANG_LABEL[lang] ?? lang;
          return (
            <div style={{
              marginTop: 10,
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "3px 10px", borderRadius: 3,
              background: "var(--color-canvas)",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)",
            }}>
              <i className="ph ph-translate"></i>
              Traduit{langLabel ? ` du ${langLabel}` : ""} automatiquement par {meta.provider || "DeepL"}
            </div>
          );
        })()}

        <div style={{ marginTop: 14, display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "var(--color-sepia)" }}>
          <div><i className="ph ph-buildings" style={{ marginRight: 6 }}></i><strong style={{ color: "var(--color-ink)" }}>{bailleurLabel}</strong></div>
          {opp.secteur && <div><i className="ph ph-tag" style={{ marginRight: 6 }}></i>{opp.secteur}</div>}
          <div><i className="ph ph-receipt" style={{ marginRight: 6 }}></i>{TYPE_LABEL[opp.typeFinancement] ?? opp.typeFinancement}</div>
          {opp.region && <div><i className="ph ph-map-pin" style={{ marginRight: 6 }}></i>{opp.region}</div>}
        </div>
      </header>

      {/* ============ BANDEAU CANDIDATURE EN COURS ============ */}
      {opp.candidature && (
        <div className="card" style={{
          marginTop: 16, padding: 14,
          background: "var(--color-success-soft)", borderColor: "rgba(58,124,89,0.18)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <i className="ph ph-check-circle" style={{ color: "#15803d", marginRight: 8 }}></i>
            <strong>Candidature {opp.candidature.reference}</strong> en cours · statut <em>{opp.candidature.statut}</em>
          </div>
          <Link href={`/candidatures/${opp.candidature.id}`} className="btn btn--accent btn--sm">
            <i className="ph ph-folder-notch-open"></i> Ouvrir le dossier
          </Link>
        </div>
      )}

      {/* ============ KPIs FACTS ============ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 24 }}>
        <FactCard
          icon="ph-coins"
          label="Montant estimé"
          value={fmtMoney(opp.montantEstime, opp.devise)}
        />
        <FactCard
          icon="ph-clock-countdown"
          label="Date limite"
          value={fmtDate(opp.dateLimiteDepot)}
          hint={cd?.label}
          hintColor={cd?.color}
          hintBg={cd?.bg}
        />
        <FactCard
          icon="ph-calendar-blank"
          label="Date de publication"
          value={fmtDate(opp.datePublication)}
        />
        <FactCard
          icon="ph-globe"
          label="Couverture géographique"
          value={opp.paysCible.length === 1 ? paysLabel(opp.paysCible[0]) : `${opp.paysCible.length} pays`}
          hint={opp.paysCible.length > 1 ? opp.paysCible.map(paysLabel).slice(0, 4).join(", ") + (opp.paysCible.length > 4 ? "…" : "") : undefined}
        />
      </div>

      {/* ============ CORPS PRINCIPAL ============ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, marginTop: 24, alignItems: "start" }}>
        {/* COLONNE CENTRALE */}
        <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
          {/* Description : rendu structuré (paragraphes, listes, labels,
              liens cliquables) via RichDescription. Le texte est traduit
              en français côté connecteur via DeepL. */}
          <section className="card" style={{ padding: "24px 28px" }}>
            <SectionTitle icon="ph-file-text" title="Description de l'appel à propositions" />
            <RichDescription
              text={opp.description}
              emptyMessage="Aucune description courte disponible pour cette opportunité. Consultez l'annonce d'origine via le bouton dans la barre latérale."
            />
          </section>

          {/* Calendrier : on n'affiche que les étapes datées */}
          {(() => {
            const steps = [
              { label: "Publication", date: opp.datePublication, icon: "ph-megaphone" },
              { label: "Clôture des dépôts", date: opp.dateLimiteDepot, icon: "ph-flag-checkered", highlight: cd ? { color: cd.color, bg: cd.bg } : undefined },
              { label: "Collectée par CHADIA", date: opp.collecteAt, icon: "ph-cloud-arrow-down" },
              { label: "Décision CHADIA", date: opp.decideeAt ?? null, icon: "ph-gavel" },
            ].filter((s) => !!s.date);
            if (steps.length === 0) return null;
            return (
              <section className="card" style={{ padding: "24px 28px" }}>
                <SectionTitle icon="ph-calendar" title="Calendrier de l'appel" />
                <div style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(steps.length, 4)}, 1fr)`,
                  gap: 12,
                }}>
                  {steps.map((s) => (
                    <TimelineItem key={s.label} label={s.label} date={s.date as string} icon={s.icon} highlight={s.highlight} />
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Tags / classification */}
          {(opp.tags?.length > 0 || opp.paysCible.length > 0) && (
            <section className="card" style={{ padding: 22 }}>
              <SectionTitle icon="ph-tag" title="Classification" />
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {opp.paysCible.map((c) => (
                  <span key={c} style={chipStyle}>
                    <i className="ph ph-map-pin" style={{ marginRight: 4 }}></i>{paysLabel(c)}
                  </span>
                ))}
                {opp.tags?.map((t) => (
                  <span key={t} style={{ ...chipStyle, background: "var(--color-canvas)" }}>#{t}</span>
                ))}
              </div>
            </section>
          )}

          {/* Pièces jointes */}
          <section className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <SectionTitle icon="ph-paperclip" title="Pièces jointes" hint="TDR, modèles de formulaires, annexes communiquées par le bailleur." />
              {canDecide && (
                <DocumentUploader
                  opportuniteId={opp.id}
                  defaultCategory="CONVENTIONS_BAILLEURS"
                  defaultType="TDR"
                  defaultVisibility="INTERNE"
                  buttonLabel="Joindre une pièce"
                  compact
                />
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <DocumentList
                documents={opp.documents ?? []}
                emptyMessage="Aucune pièce jointe pour le moment. Téléversez le TDR ou les annexes."
                compact
              />
            </div>
          </section>
        </div>

        {/* COLONNE DROITE */}
        <aside style={{ display: "grid", gap: 16 }}>
          {/* Décision CHADIA */}
          {canDecide && (
            <section className="card" style={{ padding: 18 }}>
              <SectionTitle icon="ph-gavel" title="Décision CHADIA" hint="On candidate, on ignore, ou on garde sous le coude." />
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                {opp.statut !== "A_ETUDIER" && opp.statut !== "CANDIDATEE" && (
                  <form action={setEtudier}>
                    <button type="submit" className="btn btn--secondary btn--sm" style={{ width: "100%" }}>
                      <i className="ph ph-magnifying-glass"></i> Marquer à étudier
                    </button>
                  </form>
                )}
                {canCandidater && (
                  <form action={startCand}>
                    <button type="submit" className="btn btn--accent btn--sm" style={{ width: "100%" }}>
                      <i className="ph ph-folder-notch-plus"></i> Démarrer une candidature
                    </button>
                  </form>
                )}
                {opp.statut !== "IGNOREE" && opp.statut !== "CANDIDATEE" && (
                  <form action={setIgnoree}>
                    <button type="submit" className="btn btn--ghost btn--sm" style={{ width: "100%" }}>
                      <i className="ph ph-x-circle"></i> Ignorer
                    </button>
                  </form>
                )}
                {opp.statut !== "NOUVELLE" && opp.statut !== "CANDIDATEE" && (
                  <form action={reset}>
                    <button type="submit" className="btn btn--ghost btn--sm" style={{ width: "100%", color: "var(--color-stone)", fontSize: 11 }}>
                      Réinitialiser
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* Lien source officielle */}
          <section className="card" style={{ padding: 18 }}>
            <SectionTitle icon="ph-link" title="Source officielle" />
            <p style={{ fontSize: 12, color: "var(--color-shale)", margin: "6px 0 12px" }}>
              {srcMeta.description}
            </p>
            {opp.sourceUrl ? (
              <a
                href={opp.sourceUrl}
                target="_blank" rel="noreferrer noopener"
                className="btn btn--secondary btn--sm"
                style={{ width: "100%" }}
              >
                <i className="ph ph-arrow-square-out"></i> Voir l&apos;annonce d&apos;origine
              </a>
            ) : (
              <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>
                Aucune URL source disponible.
              </p>
            )}
          </section>

          {/* Contact (Sam.gov et BM exposent un contact) */}
          {contact && (
            <section className="card" style={{ padding: 18 }}>
              <SectionTitle icon="ph-address-book" title="Contact officiel" />
              <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
                {contact.name && <div><strong>{contact.name}</strong></div>}
                {contact.organization && <div style={{ color: "var(--color-stone)" }}>{contact.organization}</div>}
                {contact.email && (
                  <div style={{ marginTop: 4 }}>
                    <i className="ph ph-envelope" style={{ marginRight: 6, color: "var(--color-shale)" }}></i>
                    <a href={`mailto:${contact.email}`} style={{ color: "var(--color-terracotta)" }}>{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <i className="ph ph-phone" style={{ marginRight: 6, color: "var(--color-shale)" }}></i>
                    {contact.phone}
                  </div>
                )}
                {contact.address && (
                  <div style={{ color: "var(--color-stone)", fontSize: 12, whiteSpace: "pre-line" }}>
                    <i className="ph ph-map-pin" style={{ marginRight: 6 }}></i>
                    {contact.address}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Métadonnées source */}
          <section className="card" style={{ padding: 18 }}>
            <SectionTitle icon="ph-info" title="Métadonnées" />
            <dl style={{ marginTop: 10, display: "grid", gap: 10, fontSize: 13 }}>
              <DlItem label="Connecteur" value={srcMeta.label} />
              {opp.sourceId && <DlItem label="ID source" value={opp.sourceId} mono />}
              <DlItem label="Type" value={TYPE_LABEL[opp.typeFinancement] ?? opp.typeFinancement} />
              <DlItem label="Devise" value={opp.devise} />
              <DlItem label="Collectée" value={fmtDateShort(opp.collecteAt)} />
              {opp.decideeAt && <DlItem label="Décidée" value={fmtDateShort(opp.decideeAt)} />}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------
function SectionTitle({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div>
      <h3 style={{
        margin: 0,
        fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500,
        color: "var(--color-ink)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <i className={`ph ${icon}`} style={{ color: "var(--color-terracotta)" }}></i>
        {title}
      </h3>
      {hint && (
        <p style={{ fontSize: 12, color: "var(--color-shale)", margin: "4px 0 0", lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function FactCard({ icon, label, value, hint, hintColor, hintBg }: {
  icon: string; label: string; value: string; hint?: string; hintColor?: string; hintBg?: string;
}) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--color-surface)",
      border: "1px solid var(--color-line)",
      borderRadius: 6,
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-stone)" }}>
        <i className={`ph ${icon}`} style={{ marginRight: 6 }}></i>{label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-ink)", marginTop: 6, lineHeight: 1.3 }}>
        {value}
      </div>
      {hint && (
        <div style={{
          marginTop: 6, display: "inline-block",
          padding: "2px 8px", borderRadius: 3,
          fontFamily: "var(--font-mono)", fontSize: 10,
          background: hintBg ?? "transparent", color: hintColor ?? "var(--color-shale)",
          fontWeight: 600,
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ label, date, icon, highlight }: {
  label: string; date: string | null | undefined; icon: string; highlight?: { color: string; bg: string };
}) {
  return (
    <div style={{
      padding: "12px 14px",
      background: highlight?.bg ?? "var(--color-canvas)",
      borderRadius: 4,
      border: highlight ? `1px solid ${highlight.color}33` : "1px solid var(--color-line)",
    }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: highlight?.color ?? "var(--color-stone)" }}>
        <i className={`ph ${icon}`} style={{ marginRight: 6 }}></i>{label}
      </div>
      <div style={{ marginTop: 4, fontSize: 14, color: highlight?.color ?? "var(--color-ink)", fontWeight: highlight ? 600 : 400 }}>
        {fmtDate(date)}
      </div>
    </div>
  );
}

function DlItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <dt style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-shale)" }}>
        {label}
      </dt>
      <dd style={{ margin: 0, color: "var(--color-ink)", fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: mono ? 11 : 13, textAlign: "right", overflowWrap: "anywhere" }}>
        {value}
      </dd>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  padding: "3px 10px", borderRadius: 3,
  background: "var(--color-terracotta-soft)",
  color: "var(--color-terracotta)",
  fontFamily: "var(--font-mono)", fontSize: 11,
};

// ---------------------------------------------------------------------
// Extracteurs spécifiques source
// ---------------------------------------------------------------------
function extractContact(source: SourceKey, raw: Record<string, unknown>): null | {
  name?: string; organization?: string; email?: string; phone?: string; address?: string;
} {
  if (source === "WORLDBANK") {
    const r = raw as { contact_name?: string; contact_organization?: string; contact_email?: string; contact_phone_no?: string; contact_address?: string };
    if (!r.contact_name && !r.contact_email) return null;
    return {
      name: r.contact_name,
      organization: r.contact_organization,
      email: r.contact_email,
      phone: r.contact_phone_no,
      address: r.contact_address,
    };
  }
  if (source === "SAM_GOV") {
    const pocs = (raw as { pointOfContacts?: Array<{ fullName?: string; email?: string; phone?: string; title?: string }> }).pointOfContacts;
    const primary = pocs?.[0];
    if (!primary) return null;
    return {
      name: primary.fullName,
      organization: primary.title,
      email: primary.email,
      phone: primary.phone,
    };
  }
  return null;
}

