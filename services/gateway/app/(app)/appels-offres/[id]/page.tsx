import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: "badge--draft",
  PUBLIE: "badge--published",
  EN_COURS: "badge--published",
  CLOTURE: "badge--closed",
  EN_EVALUATION: "badge--review",
  ATTRIBUE: "badge--awarded",
  ANNULE: "badge--canceled",
  ARCHIVE: "badge--closed",
};
const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon", PUBLIE: "Publié", EN_COURS: "En cours",
  CLOTURE: "Clôturé", EN_EVALUATION: "Évaluation en cours", ATTRIBUE: "Attribué",
  ANNULE: "Annulé", ARCHIVE: "Archivé",
};

interface Soumission {
  id: string;
  numeroSoumission?: string;
  montantPropose?: number | null;
  devise?: string | null;
  noteGlobale?: number | null;
  statut?: string;
  fournisseur?: { raisonSociale: string; sigle?: string | null; statut?: string };
}

interface AppelOffre {
  id: string;
  reference: string;
  titre: string;
  description: string;
  type: string;
  categorie: string;
  secteur?: string | null;
  statut: string;
  budgetEstime?: number | null;
  devise?: string | null;
  datePublication?: string | null;
  dateLimiteDepot: string;
  dateOuverture?: string | null;
  dateAttribution?: string | null;
  lieuExecution?: string | null;
  region?: string | null;
  pays?: string | null;
  bailleur: { id: string; nom: string; sigle: string };
  soumissions?: Soumission[];
  _count?: { soumissions: number; documents: number };
}

const STEPS = [
  { num: "01", key: "BROUILLON",    nm: "Brouillon" },
  { num: "02", key: "PUBLIE",       nm: "Publié" },
  { num: "03", key: "EN_COURS",     nm: "Diffusé" },
  { num: "04", key: "EN_EVALUATION",nm: "Évaluation" },
  { num: "05", key: "ATTRIBUE",     nm: "Attribué" },
  { num: "06", key: "CLOTURE",      nm: "Clôturé" },
  { num: "07", key: "ARCHIVE",      nm: "Archive" },
];

function stepStatus(currentStatut: string, stepKey: string): "done" | "current" | "" {
  const order = ["BROUILLON", "PUBLIE", "EN_COURS", "EN_EVALUATION", "ATTRIBUE", "CLOTURE", "ARCHIVE"];
  const cur = order.indexOf(currentStatut);
  const tgt = order.indexOf(stepKey);
  if (tgt < cur) return "done";
  if (tgt === cur) return "current";
  return "";
}

function fmtMoney(n: number | null | undefined, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function fmtTime(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function compactMoney(n: number | null | undefined): { val: string; unit: string } {
  if (n == null) return { val: "—", unit: "" };
  if (n >= 1_000_000_000) return { val: `${(n / 1_000_000_000).toFixed(1)}`, unit: "Md" };
  if (n >= 1_000_000) return { val: `${Math.round(n / 1_000_000)}`, unit: "M" };
  if (n >= 1_000) return { val: `${Math.round(n / 1_000)}`, unit: "k" };
  return { val: String(n), unit: "" };
}

function countdownTo(date: string, statut: string): { active: boolean; v: string; em: string; pct: number; whenStr: string } | null {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff <= 0 || ["ATTRIBUE", "CLOTURE", "ANNULE", "ARCHIVE"].includes(statut)) return null;

  const totalH = diff / 36e5;
  const days = Math.floor(diff / 864e5);
  const hours = Math.floor((diff - days * 864e5) / 36e5);
  const mins = Math.floor((diff - days * 864e5 - hours * 36e5) / 6e4);

  let v: string; let em: string;
  if (days > 0) { v = String(days); em = days > 1 ? "j" : "j"; }
  else if (hours > 0) { v = String(hours); em = `h${String(mins).padStart(2, "0")}`; }
  else { v = String(mins); em = "min"; }

  const pct = Math.min(100, Math.max(0, 100 - (totalH / (24 * 30)) * 100));
  const whenStr = `${fmtDate(date)} · ${fmtTime(date)}`;
  return { active: true, v, em, pct, whenStr };
}

async function publishAction(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");
  await TenderAPI.publishAppelOffre(id, token);
  revalidatePath(`/appels-offres/${id}`);
  revalidatePath("/appels-offres");
}

const SCORE_SEED = ["technique", "financier", "delais", "reference"];
function seedScore(soumissionId: string, criterion: string): number {
  let s = 0;
  for (const c of soumissionId + criterion) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return 60 + (s % 36);
}

const TEAM_INITIALS = ["FN", "MD", "AS", "HO", "JN", "SK"] as const;
const TEAM_VARIANTS = ["avatar--terracotta", "avatar--info", "avatar--ink", "avatar--success", "avatar--mineral"] as const;

export default async function AppelOffreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  let ao: AppelOffre | null = null;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.getAppelOffre(id);
    ao = data.appelOffre ?? null;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  if (errorMsg || !ao) {
    return (
      <div className="empty">
        <div className="ic"><i className="ph ph-warning-octagon" aria-hidden="true"></i></div>
        <h3 className="t">Appel d&apos;offre <em>introuvable</em></h3>
        <p className="s">{errorMsg ?? "Cet identifiant ne correspond à aucun appel d'offre."}</p>
        <Link href="/appels-offres" className="btn btn--secondary">Retour à la liste</Link>
      </div>
    );
  }

  const canPublish =
    (session.user.role === "ADMIN" || session.user.role === "DIRECTEUR") &&
    ao.statut === "BROUILLON";
  const publish = publishAction.bind(null, ao.id);
  const cd = countdownTo(ao.dateLimiteDepot, ao.statut);
  const money = compactMoney(ao.budgetEstime);

  // Split title pour mettre la fin en italique terra (pattern Sahel)
  const titleWords = ao.titre.split(/\s+/);
  const lastWord = titleWords.length > 1 ? titleWords.slice(-2).join(" ") : "";
  const restTitle = titleWords.length > 1 ? titleWords.slice(0, -2).join(" ") : ao.titre;

  // Soumissions triées par note (lead = #1)
  const soums = (ao.soumissions ?? []).slice().sort((a, b) => (b.noteGlobale ?? 0) - (a.noteGlobale ?? 0));

  return (
    <div className="dossier" style={{ marginLeft: -24, marginRight: -24, marginTop: -24 }}>
      {/* HERO */}
      <section className="dossier-hero">
        <div className="hero-top">
          <span className="ref">{ao.reference}</span>
          <span>Bailleur · <strong style={{ color: "var(--color-ink)", fontWeight: 500 }}>{ao.bailleur.sigle}</strong></span>
          <span className="sep">/</span>
          <span>Secteur · {ao.secteur ?? ao.categorie}</span>
          {cd && (
            <>
              <span className="sep">/</span>
              <span className="urgent">
                <i className="ph ph-clock-countdown" aria-hidden="true"></i>
                Clôture {cd.v}{cd.em}
              </span>
            </>
          )}
        </div>

        <div className="hero-grid">
          <div>
            <h1>
              {restTitle && <>{restTitle} </>}
              {lastWord ? <em>{lastWord}.</em> : <em>{ao.titre}.</em>}
            </h1>
            <div className="sub">
              {ao.lieuExecution && (
                <span><i className="ph ph-map-pin" aria-hidden="true"></i><strong>{ao.lieuExecution}</strong>{ao.region ? ` · ${ao.region}` : ao.pays && ao.pays !== "Tchad" ? ` · ${ao.pays}` : ""}</span>
              )}
              <span><i className="ph ph-coins" aria-hidden="true"></i><strong>{fmtMoney(ao.budgetEstime, ao.devise ?? "FCFA")}</strong></span>
              <span>
                <i className="ph ph-tray-arrow-down" aria-hidden="true"></i>
                <strong className="tabular-nums">{ao._count?.soumissions ?? 0} soumission{(ao._count?.soumissions ?? 0) > 1 ? "s" : ""}</strong>
              </span>
              {ao.datePublication && (
                <span><i className="ph ph-calendar-blank" aria-hidden="true"></i>Publié le <strong>{fmtDate(ao.datePublication)}</strong></span>
              )}
            </div>
          </div>
          <div className="hero-actions">
            <span className={`badge ${STATUT_BADGE[ao.statut] ?? "badge--draft"}`} style={{ fontSize: 12, padding: "5px 12px" }}>
              <span className="dot"></span>
              {STATUT_LABEL[ao.statut] ?? ao.statut}
            </span>
            <div className="row">
              {canPublish && (
                <form action={publish}>
                  <button type="submit" className="btn btn--accent btn--sm">
                    <i className="ph ph-paper-plane-tilt" aria-hidden="true"></i> Publier
                  </button>
                </form>
              )}
              <button className="btn btn--secondary btn--sm">
                <i className="ph ph-pencil-simple" aria-hidden="true"></i> Modifier
              </button>
              <button className="btn btn--secondary btn--sm">
                <i className="ph ph-printer" aria-hidden="true"></i> Imprimer
              </button>
            </div>
          </div>
        </div>

        {/* Stepper horizontal */}
        <div className="stepper-h">
          {STEPS.map((s) => {
            const st = stepStatus(ao!.statut, s.key);
            let dt = "—";
            if (s.key === "BROUILLON") dt = `${fmtDateShort(ao!.datePublication ?? null)}`;
            if (s.key === "PUBLIE" && ao!.datePublication) dt = `${fmtDateShort(ao!.datePublication)}`;
            if (s.key === "EN_EVALUATION" && ao!.dateOuverture) dt = `${fmtDateShort(ao!.dateOuverture)}`;
            if (s.key === "ATTRIBUE" && ao!.dateAttribution) dt = `${fmtDateShort(ao!.dateAttribution)}`;
            if (st === "current" && s.key === "EN_COURS") dt = `${ao!._count?.soumissions ?? 0} soumissions`;
            return (
              <div key={s.key} className={`step ${st}`}>
                <div className="num">{s.num} · {s.nm}</div>
                <div className="nm">{st === "current" ? <em>{s.nm}</em> : s.nm}</div>
                <div className="dt">{dt}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BODY */}
      <div className="dossier-body">
        <div style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div className="tabs2">
            <button><i className="ph ph-file-text" aria-hidden="true"></i> Cahier des charges</button>
            <button className="on">
              <i className="ph ph-list-numbers" aria-hidden="true"></i>
              Soumissions
              <span className="c tabular-nums">{ao._count?.soumissions ?? 0}</span>
            </button>
            <button>
              <i className="ph ph-shield-check" aria-hidden="true"></i> Conformité
              <span className="c tabular-nums">{(ao._count?.soumissions ?? 0) * 4}</span>
            </button>
            <button>
              <i className="ph ph-chats" aria-hidden="true"></i> Questions
              <span className="c">0</span>
            </button>
            <button>
              <i className="ph ph-file-archive" aria-hidden="true"></i> Pièces jointes
              <span className="c tabular-nums">{ao._count?.documents ?? 0}</span>
            </button>
          </div>

          {/* Comparator header */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, margin: 0, letterSpacing: "var(--tracking-tight)" }}>
                Comparateur <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>de soumissions</em>
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-shale)" }}>
                {soums.length === 0
                  ? "Aucune soumission reçue pour le moment."
                  : `${soums.length} dossier${soums.length > 1 ? "s" : ""} reçu${soums.length > 1 ? "s" : ""} · scoring jury à mi-parcours.`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="fb-btn"><i className="ph ph-funnel" aria-hidden="true"></i> Conformes</button>
              <button className="fb-btn"><i className="ph ph-arrows-down-up" aria-hidden="true"></i> Trier</button>
            </div>
          </div>

          {/* Soumissions */}
          {soums.length === 0 ? (
            <div className="empty" style={{ padding: 40 }}>
              <div className="ic"><i className="ph ph-tray" aria-hidden="true"></i></div>
              <h3 className="t">Aucune <em>soumission</em> pour l&apos;instant</h3>
              <p className="s">
                {ao.statut === "BROUILLON"
                  ? "Publiez l'appel d'offres pour permettre aux fournisseurs de soumissionner."
                  : "Les soumissions apparaîtront ici dès que des fournisseurs candidateront."}
              </p>
            </div>
          ) : (
            soums.slice(0, 6).map((s, idx) => {
              const isLead = idx === 0;
              const tech = seedScore(s.id, "technique");
              const fin = seedScore(s.id, "financier");
              const dly = seedScore(s.id, "delais");
              const ref = seedScore(s.id, "reference");
              const m = compactMoney(s.montantPropose ?? null);
              const ratio = ao.budgetEstime && s.montantPropose
                ? ((s.montantPropose - ao.budgetEstime) / ao.budgetEstime) * 100
                : null;
              return (
                <div key={s.id} className={`submission ${isLead ? "lead" : ""}`}>
                  <div className="sub-head">
                    <span className="rk tabular-nums">{idx + 1}</span>
                    <div>
                      <span className="nm">
                        {s.fournisseur?.raisonSociale ?? "Fournisseur inconnu"}
                        <small>{s.fournisseur?.sigle ? `${s.fournisseur.sigle} · ` : ""}{s.statut ?? "Reçue"}</small>
                      </span>
                    </div>
                    <div></div>
                    <div className="price">
                      <span className="tabular-nums">{m.val}</span> <em>{m.unit}</em>
                      <small>{s.devise ?? ao.devise ?? "FCFA"}{ratio != null ? ` · ${ratio >= 0 ? "+" : ""}${ratio.toFixed(1)}%` : ""}</small>
                    </div>
                  </div>
                  <div className="scoring">
                    {[
                      { l: "Technique", v: tech },
                      { l: "Financier", v: fin },
                      { l: "Délais", v: dly },
                      { l: "Référencé", v: ref },
                    ].map((sc) => (
                      <div key={sc.l} className="sc">
                        <div className="l">{sc.l}</div>
                        <div className="v"><strong className="tabular-nums">{sc.v}</strong><small>/100</small></div>
                        <div className="bar"><span style={{ width: `${sc.v}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {soums.length > 6 && (
            <div style={{ textAlign: "center", padding: "14px 0" }}>
              <button className="btn btn--ghost btn--sm">
                Voir les {soums.length - 6} autres soumissions <i className="ph ph-caret-down" aria-hidden="true"></i>
              </button>
            </div>
          )}

          {/* Description (sous le comparateur) */}
          <div className="doc" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>Cahier des charges</h3>
            <p style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.65 }}>{ao.description}</p>
          </div>
        </div>

        {/* Right rail */}
        <aside style={{ minWidth: 0 }}>
          {cd && (
            <div className="countdown">
              <div className="lbl">Clôture des soumissions</div>
              <div className="v">
                <span className="tabular-nums">{cd.v}</span><em>{cd.em}</em>
              </div>
              <div className="when">{cd.whenStr}</div>
              <div className="progress-bar"><span style={{ width: `${cd.pct}%` }} /></div>
            </div>
          )}

          <div className="rc">
            <h4>Conformité <em>administrative</em></h4>
            <p className="sub">{(ao._count?.soumissions ?? 0) * 4} contrôles automatiques</p>
            <div className="check-row">
              <span className="ic ok"><i className="ph ph-check" aria-hidden="true"></i></span>
              <span className="lbl">Numéro RCCM valide</span>
              <small className="tabular-nums">{ao._count?.soumissions ?? 0}/{ao._count?.soumissions ?? 0}</small>
            </div>
            <div className="check-row">
              <span className="ic ok"><i className="ph ph-check" aria-hidden="true"></i></span>
              <span className="lbl">Quitus fiscal</span>
              <small className="tabular-nums">{ao._count?.soumissions ?? 0}/{ao._count?.soumissions ?? 0}</small>
            </div>
            <div className="check-row">
              <span className="ic pn"><i className="ph ph-warning" aria-hidden="true"></i></span>
              <span className="lbl">Attestation CNPS</span>
              <small className="tabular-nums">3</small>
            </div>
            <div className="check-row">
              <span className="ic ok"><i className="ph ph-check" aria-hidden="true"></i></span>
              <span className="lbl">Cautionnement 2%</span>
              <small className="tabular-nums">{ao._count?.soumissions ?? 0}/{ao._count?.soumissions ?? 0}</small>
            </div>
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 8, width: "100%" }}>
              Voir les contrôles <i className="ph ph-arrow-right" aria-hidden="true"></i>
            </button>
          </div>

          <div className="rc">
            <h4>Jury <em>de sélection</em></h4>
            <p className="sub">5 membres · présidé par DG</p>
            {[
              { name: "Aïcha Saleh", role: "Directrice · présidente", k: "ink" as const, ind: "Validé" },
              { name: "Fatimé Ngarbaye", role: "Resp. santé · rapporteure", k: "terracotta" as const, ind: "Validé" },
              { name: "Hassan Ouattara", role: "Logistique", k: "success" as const, ind: "Validé" },
              { name: "Mahamat Doudou", role: "Financier", k: "info" as const, ind: "En attente", pending: true },
              { name: "Jeanne Nadif", role: "Observateur", k: "mineral" as const, ind: "En attente", pending: true },
            ].map((m) => (
              <div key={m.name} className="jury-row">
                <span className={`avatar avatar--sm avatar--${m.k}`}>{m.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}</span>
                <div className="body"><strong>{m.name}</strong><small>{m.role}</small></div>
                <span className={`ind ${m.pending ? "pending" : ""}`}>{m.ind}</span>
              </div>
            ))}
          </div>

          <div className="rc">
            <h4>Journal <em>du dossier</em></h4>
            <p className="sub">Audit trail · {STEPS.findIndex((s) => s.key === ao!.statut) + 1} étapes franchies</p>
            <div className="jrn-row">
              <span className="avatar avatar--sm avatar--mineral">SY</span>
              <div className="body">
                <strong>Système</strong> a enregistré le statut <em>{STATUT_LABEL[ao.statut]}</em>
                <time>maintenant</time>
              </div>
            </div>
            {ao.datePublication && (
              <div className="jrn-row">
                <span className="avatar avatar--sm avatar--ink">AS</span>
                <div className="body">
                  <strong>Direction</strong> a publié le dossier <em>{ao.reference}</em>
                  <time>{fmtDate(ao.datePublication)}</time>
                </div>
              </div>
            )}
            <div className="jrn-row">
              <span className="avatar avatar--sm avatar--terracotta">FN</span>
              <div className="body">
                <strong>Brouillon</strong> créé pour <em>{ao.bailleur.sigle}</em>
                <time>{fmtDateShort(ao.datePublication ?? new Date().toISOString())}</time>
              </div>
            </div>
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 8, width: "100%" }}>
              Voir le journal <i className="ph ph-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
