import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DocumentUploader } from "@/components/DocumentUploader";
import { EditProjetButton } from "./EditProjetButton";
import { DeleteProjetButton } from "./DeleteProjetButton";

interface Projet {
  id: string;
  reference: string;
  titre: string;
  description?: string | null;
  zone?: string | null;
  domaine: string;
  statut: "MONTAGE" | "ACTIF" | "ACHEVE" | "SUSPENDU" | "ANNULE";
  urgent: boolean;
  bailleurs: string[];
  team: string[];
  echeance?: string | null;
  avancement: number;
  etapeLabel?: string | null;
  budgetEstime?: number | null;
  budgetRealise?: number | null;
  devise: string;
  beneficiaires?: number | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  dateCloture?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocSummary {
  id: string;
  nom: string;
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
}

const DOMAINE_LABEL: Record<string, string> = {
  URGENCE: "Urgence",
  JEUNESSE: "Jeunesse",
  GENRE: "Genre",
  FEMMES: "Femmes",
  EDUCATION: "Éducation",
  EAU: "Eau",
  SANTE: "Santé",
  COHESION: "Cohésion",
  FORMATION: "Formation",
  AGRICULTURE: "Agriculture",
  AUTRE: "Autre",
};

const STATUT_LABEL: Record<string, string> = {
  MONTAGE: "En montage",
  ACTIF: "Actif",
  ACHEVE: "Achevé",
  SUSPENDU: "Suspendu",
  ANNULE: "Annulé",
};

const STATUT_BADGE: Record<string, string> = {
  MONTAGE: "badge--draft",
  ACTIF: "badge--review",
  ACHEVE: "badge--published",
  SUSPENDU: "badge--warning",
  ANNULE: "badge--canceled",
};

function donorTone(b: string): "ue" | "pnud" | "cf" | "afd" | "bm" | "echo" | "usaid" | "" {
  const k = b.toUpperCase();
  if (k.startsWith("UE") || k.includes("EUROP") || k.includes("UNION")) return "ue";
  if (k.startsWith("PNUD") || k.startsWith("UNDP") || k.includes("PROGRAMME")) return "pnud";
  if (k.includes("FRANC") || k.includes("FRANC.") || k.startsWith("CF")) return "cf";
  if (k.startsWith("AFD")) return "afd";
  if (k.startsWith("BM") || k.includes("MONDIAL") || k.includes("WORLDBANK")) return "bm";
  if (k.startsWith("ECHO")) return "echo";
  if (k.startsWith("USAID")) return "usaid";
  return "";
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoneyCompact(n: number | null | undefined, cur: string): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n)} ${cur}`;
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (24 * 3600 * 1000));
}

async function updateAvancementAction(id: string, formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  const av = Number(formData.get("avancement"));
  const etapeLabel = String(formData.get("etapeLabel") || "") || null;
  await TenderAPI.updateProjetAvancement(id, { avancement: av, etapeLabel: etapeLabel ?? undefined }, token);
  revalidatePath(`/projets/${id}`);
  revalidatePath("/projets");
}

// Édition complète du projet (titre, description, zone, statut, budgets…).
// Réservé ADMIN/DIRECTEUR — c'est plus large que la simple maj d'avancement.
async function updateProjetAction(id: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR") {
    return { ok: false, error: "Seuls l'admin et le directeur peuvent modifier un projet" };
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) return { ok: false, error: "Token de session manquant" };

  const body: Record<string, unknown> = {};
  const str = (k: string) => {
    if (!formData.has(k)) return undefined;
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const num = (k: string) => {
    if (!formData.has(k)) return undefined;
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };

  const fields: Array<[string, "string" | "number" | "bool" | "list" | "date"]> = [
    ["titre", "string"],
    ["description", "string"],
    ["zone", "string"],
    ["domaine", "string"],
    ["statut", "string"],
    ["urgent", "bool"],
    ["echeance", "string"],
    ["etapeLabel", "string"],
    ["budgetEstime", "number"],
    ["budgetRealise", "number"],
    ["devise", "string"],
    ["beneficiaires", "number"],
    ["bailleurs", "list"],
    ["team", "list"],
    ["dateDebut", "date"],
    ["dateFin", "date"],
  ];
  for (const [k, kind] of fields) {
    if (!formData.has(k)) continue;
    if (kind === "string") body[k] = str(k);
    else if (kind === "number") body[k] = num(k);
    else if (kind === "bool") body[k] = formData.get(k) === "on" || formData.get(k) === "true";
    else if (kind === "list") {
      body[k] = String(formData.get(k) ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    } else if (kind === "date") {
      const v = String(formData.get(k) ?? "").trim();
      body[k] = v ? new Date(v).toISOString() : null;
    }
  }

  try {
    await TenderAPI.updateProjet(id, body, token);
    revalidatePath(`/projets/${id}`);
    revalidatePath("/projets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de modification" };
  }
}

// Suppression définitive du projet (DIRECTEUR uniquement côté tender-service).
async function deleteProjetAction(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "DIRECTEUR") {
    throw new Error("Seul le directeur peut supprimer un projet.");
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  await TenderAPI.deleteProjet(id, token);
  revalidatePath("/projets");
  redirect("/projets");
}

/**
 * Phases-types pour un projet ONG. Comme le data model n'a pas de phases
 * explicites, on les dérive du pourcentage d'avancement global :
 *   chaque phase = 100/N. La phase courante est celle qui contient le %.
 */
function buildPhases(projet: Projet): Array<{ n: number; t: string; s: string; pct: number; state: "done" | "now" | "todo" }> {
  const allPhases = [
    { t: "Diagnostic terrain & ciblage", s: "Enquêtes, liste bénéficiaires, validation comité" },
    { t: "Mobilisation équipe & logistique", s: "Recrutements, bureaux terrain, fournisseurs" },
    { t: "Mise en œuvre · vague 1", s: "Premiers livrables, distributions, attestations" },
    { t: "Suivi intermédiaire", s: "Reporting bailleur T1/T2, contrôle qualité" },
    { t: "Mise en œuvre · vague 2", s: "Suite des activités, ajustements terrain" },
    { t: "Formation des bénéficiaires", s: "Comités gestion, sessions transfert de compétences" },
    { t: "Évaluation finale", s: "Étude d'impact, rapport au bailleur, capitalisation" },
  ];
  const step = 100 / allPhases.length;
  return allPhases.map((p, i) => {
    const lower = i * step;
    const upper = (i + 1) * step;
    const pct = projet.avancement >= upper ? 100 : projet.avancement <= lower ? 0 : Math.round(((projet.avancement - lower) / step) * 100);
    let state: "done" | "now" | "todo" = "todo";
    if (projet.avancement >= upper) state = "done";
    else if (projet.avancement > lower) state = "now";
    return { n: i + 1, ...p, pct, state };
  });
}

export default async function ProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  const { id } = await params;

  let projet: Projet | null = null;
  try {
    const data = await TenderAPI.getProjet(id, token);
    projet = data.projet ?? null;
  } catch {
    projet = null;
  }
  if (!projet) notFound();

  // Documents attachés au projet
  let documents: DocSummary[] = [];
  try {
    const docs = await TenderAPI.listDocuments({ projetId: projet.id }, token);
    documents = docs.documents ?? [];
  } catch {
    /* silencieux */
  }

  const updateAction = updateAvancementAction.bind(null, projet.id);
  const editAction = updateProjetAction.bind(null, projet.id);
  const deleteAction = deleteProjetAction.bind(null, projet.id);
  const phases = buildPhases(projet);
  const phasesDoneCount = phases.filter((p) => p.state === "done").length;
  const j = daysUntil(projet.dateFin);

  const totalShare = projet.bailleurs.length > 0 ? Math.round(100 / projet.bailleurs.length) : 0;

  const userRole = session.user.role;
  const canEdit = userRole === "ADMIN" || userRole === "DIRECTEUR";
  const canDelete = userRole === "DIRECTEUR";

  return (
    <div className="pg">
      {/* === Toolbar admin (édition / suppression) === */}
      {canEdit ? (
        <div
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 14, padding: "10px 14px",
            background: "var(--color-surface)", border: "1px solid var(--color-line)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/projets" className="btn btn--ghost btn--sm" style={{ padding: "4px 8px" }}>
              <i className="ph ph-arrow-left" aria-hidden="true"></i> Tous les projets
            </Link>
            <span style={{ fontSize: 11, color: "var(--color-stone)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Édition · {userRole === "DIRECTEUR" ? "directeur" : "admin"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <EditProjetButton projet={projet} updateAction={editAction} />
            {canDelete ? (
              <DeleteProjetButton
                projetRef={projet.reference}
                projetTitre={projet.titre}
                deleteAction={deleteAction}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* === Hero === */}
      <section className="proj-hero">
        <div className="ref">
          <span>{projet.reference}</span>
          {projet.zone ? (
            <>
              <span style={{ color: "var(--color-mineral)" }}>·</span>
              <span>{projet.zone}</span>
            </>
          ) : null}
          {projet.domaine !== "AUTRE" ? (
            <>
              <span style={{ color: "var(--color-mineral)" }}>·</span>
              <span>{DOMAINE_LABEL[projet.domaine]}</span>
            </>
          ) : null}
          <span className={`badge ${STATUT_BADGE[projet.statut] ?? "badge--draft"}`} style={{ marginLeft: 8 }}>
            <span className="dot"></span>
            {STATUT_LABEL[projet.statut]}
            {j != null && j > 0 && j < 90 && projet.statut === "ACTIF" ? ` · J‑${j}` : null}
          </span>
        </div>
        <h1>{projet.titre}</h1>
        {projet.description ? <p className="lead">{projet.description}</p> : null}
        <div className="proj-hero-meta">
          <div>
            <div className="l">Avancement</div>
            <div className="v">{projet.avancement} %</div>
            <div className="d">
              {phasesDoneCount} phase{phasesDoneCount > 1 ? "s" : ""} sur {phases.length}
            </div>
          </div>
          <div>
            <div className="l">Budget engagé</div>
            <div className="v">
              {fmtMoneyCompact(projet.budgetRealise, projet.devise)} / {fmtMoneyCompact(projet.budgetEstime, projet.devise)}
            </div>
            <div className="d">
              {projet.budgetEstime
                ? `${Math.round(((projet.budgetRealise ?? 0) / projet.budgetEstime) * 100)} % engagé`
                : "—"}
            </div>
          </div>
          <div>
            <div className="l">Bénéficiaires</div>
            <div className="v">
              {projet.beneficiaires
                ? new Intl.NumberFormat("fr-FR").format(projet.beneficiaires)
                : "—"}
            </div>
            <div className="d">{projet.zone ?? "tous sites"}</div>
          </div>
          <div>
            <div className="l">Équipe</div>
            <div className="v">{projet.team.length} personne{projet.team.length > 1 ? "s" : ""}</div>
            <div className="d">{projet.bailleurs.length} bailleur{projet.bailleurs.length > 1 ? "s" : ""}</div>
          </div>
        </div>
      </section>

      <div className="proj-grid">
        {/* === Colonne principale === */}
        <div>
          {/* Tabs (visuels — Server Component) */}
          <div className="priv-tabs" role="tablist">
            <button type="button" className="priv-tab on" role="tab" aria-selected="true">
              Aperçu
            </button>
            <button type="button" className="priv-tab" role="tab" disabled aria-disabled="true">
              Phases & livrables
            </button>
            <Link href={`/projets/${projet.id}/budget`} className="priv-tab" role="tab">
              Budget
            </Link>
            <Link href={`/projets/${projet.id}/docs`} className="priv-tab" role="tab">
              Documents
            </Link>
            <button type="button" className="priv-tab" role="tab" disabled aria-disabled="true">
              Rapports bailleur
            </button>
          </div>

          {/* Avancement form */}
          <div className="card" style={{ padding: 0, marginBottom: 18 }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, margin: 0, color: "var(--color-ink)" }}>
                Avancement <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>en temps réel</em>
              </h3>
              <span style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
                {projet.etapeLabel ?? STATUT_LABEL[projet.statut]}
              </span>
            </div>
            <form action={updateAction} style={{ padding: "18px 20px", display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 14, alignItems: "end" }}>
                <div className="field-uc">
                  <span className="label">Pourcentage</span>
                  <input className="input mono" name="avancement" type="number" min={0} max={100} defaultValue={projet.avancement} />
                </div>
                <div className="field-uc">
                  <span className="label">Étape courante</span>
                  <input className="input" name="etapeLabel" defaultValue={projet.etapeLabel ?? ""} placeholder="Ex. Note conceptuelle déposée" />
                </div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-arrow-clockwise" aria-hidden="true"></i> Mettre à jour
                </button>
              </div>
              <div className="bar">
                <span
                  style={{
                    width: `${projet.avancement}%`,
                    background: projet.statut === "ACHEVE" ? "var(--color-success)" : "var(--color-terracotta)",
                  }}
                ></span>
              </div>
            </form>
          </div>

          {/* Phases */}
          <div className="card" style={{ padding: 0, marginBottom: 18 }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, margin: 0, color: "var(--color-ink)" }}>
                Phases & <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>livrables</em>
              </h3>
              <span style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
                {phasesDoneCount} / {phases.length} terminées
              </span>
            </div>
            <div className="phase-list" style={{ border: 0, borderRadius: 0 }}>
              {phases.map((p) => (
                <div key={p.n} className={`phase-row ${p.state === "done" ? "done" : p.state === "now" ? "now" : ""}`}>
                  <div className="n">
                    {p.state === "done" ? <i className="ph ph-check" aria-hidden="true"></i> : String(p.n).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="t">{p.t}</div>
                    <div className="s">{p.s}</div>
                  </div>
                  <div className="pct">{p.state === "done" ? "100 %" : `${p.pct} %`}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, margin: 0, color: "var(--color-ink)" }}>
                Documents <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>liés</em>
              </h3>
              <DocumentUploader
                projetId={projet.id}
                defaultCategory="PROJETS"
                defaultType="RAPPORT_ACTIVITE"
                buttonLabel="Ajouter"
                compact
              />
            </div>
            {documents.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <i className="ph ph-files" style={{ fontSize: 28, color: "var(--color-mineral)" }} aria-hidden="true"></i>
                <p style={{ fontSize: 13, color: "var(--color-stone)", marginTop: 12 }}>
                  Aucun document attaché. Téléversez la convention, le plan d&apos;action ou les rapports trimestriels.
                </p>
              </div>
            ) : (
              <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {documents.slice(0, 8).map((d) => {
                  const m = (d.mimeType ?? "").toLowerCase();
                  const ft = m.includes("pdf")
                    ? { k: "pdf", l: "PDF" }
                    : m.includes("word")
                    ? { k: "doc", l: "DOCX" }
                    : m.includes("excel") || m.includes("sheet")
                    ? { k: "xls", l: "XLSX" }
                    : { k: "txt", l: "FICHIER" };
                  return (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 10,
                        border: "1px solid var(--color-line)",
                        borderRadius: 6,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span className={`ftype ${ft.k}`}>{ft.l}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.nom}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-stone)" }}>
                          {fmtDate(d.createdAt)}
                          {d.version ? ` · v${d.version}` : ""}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* === Side rail === */}
        <aside>
          {/* Partenaires financiers */}
          <div className="side-w">
            <h4>
              Partenaires <span className="sub">financiers</span>
            </h4>
            {projet.bailleurs.length > 0 ? (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {projet.bailleurs.map((b) => {
                    const tone = donorTone(b);
                    return (
                      <span key={b} className={`donor ${tone}`}>
                        {b} · {totalShare} %
                      </span>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-shale)", lineHeight: 1.5 }}>
                  Cofinancement signé{" "}
                  {projet.dateDebut ? <>le {fmtDate(projet.dateDebut)}</> : null} · plafond global{" "}
                  {projet.budgetEstime
                    ? `${new Intl.NumberFormat("fr-FR").format(projet.budgetEstime)} ${projet.devise}`
                    : "—"}{" "}
                  · décaissement par tranches.
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>Aucun bailleur assigné pour ce projet.</p>
            )}
          </div>

          {/* Équipe projet */}
          <div className="side-w">
            <h4>
              Équipe <span className="sub">projet</span>
            </h4>
            {projet.team.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {projet.team.map((t, idx) => {
                  const tones = ["terracotta", "ink", "success", "info"] as const;
                  return (
                    <div key={`${t}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className={`avatar avatar--sm avatar--${tones[idx % tones.length]}`}>
                        {t.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{t}</div>
                        <div style={{ fontSize: 11, color: "var(--color-stone)" }}>Équipier</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--color-stone)", margin: 0 }}>Aucun équipier affecté.</p>
            )}
          </div>

          {/* Prochains jalons */}
          <div className="side-w">
            <h4>
              Prochains <span className="sub">jalons</span>
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
              {projet.dateFin ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <span className="mono" style={{ color: "var(--color-terracotta)", minWidth: 60 }}>
                    {new Date(projet.dateFin).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                  <span style={{ color: "var(--color-sepia)" }}>Clôture prévue du projet</span>
                </div>
              ) : null}
              {projet.echeance ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <span className="mono" style={{ color: "var(--color-shale)", minWidth: 60 }}>
                    Échéance
                  </span>
                  <span style={{ color: "var(--color-sepia)" }}>{projet.echeance}</span>
                </div>
              ) : null}
              {!projet.dateFin && !projet.echeance ? (
                <p style={{ color: "var(--color-stone)", margin: 0 }}>Aucun jalon planifié.</p>
              ) : null}
            </div>
          </div>

          {/* Risques (mockup statique — pas dans le data model) */}
          {projet.urgent || projet.statut === "ACTIF" ? (
            <div className="side-w">
              <h4>
                Risques <span className="sub">identifiés</span>
              </h4>
              <div style={{ fontSize: 12, color: "var(--color-sepia)", lineHeight: 1.5 }}>
                {projet.urgent ? (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <i className="ph ph-warning" style={{ color: "var(--color-danger)" }} aria-hidden="true"></i>
                    <span>
                      <strong style={{ color: "var(--color-ink)" }}>Urgence opérationnelle</strong> · arbitrage à
                      prévoir cette semaine.
                    </span>
                  </div>
                ) : null}
                {projet.zone?.toLowerCase().includes("guéra") || projet.zone?.toLowerCase().includes("mongo") ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <i className="ph ph-warning" style={{ color: "var(--color-warning)" }} aria-hidden="true"></i>
                    <span>
                      <strong style={{ color: "var(--color-ink)" }}>Saison des pluies</strong> · accès villages
                      restreint juillet-septembre.
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Historique */}
          <div className="side-w">
            <h4>
              Historique <span className="sub">administratif</span>
            </h4>
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--color-stone)" }}>Créé le</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>
                  {fmtDate(projet.createdAt)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--color-stone)" }}>Modifié</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>
                  {fmtDate(projet.updatedAt)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--color-stone)" }}>Début</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>{fmtDate(projet.dateDebut)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "var(--color-stone)" }}>Fin prévue</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>{fmtDate(projet.dateFin)}</span>
              </div>
              {projet.dateCloture ? (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: "var(--color-stone)" }}>Clôturé</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>{fmtDate(projet.dateCloture)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
