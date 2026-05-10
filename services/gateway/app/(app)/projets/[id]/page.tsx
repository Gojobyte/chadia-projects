import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";

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

function donorTone(b: string): "pnud" | "ue" | "cf" | "uni" | "fonds" {
  const k = b.toUpperCase();
  if (k.startsWith("PNUD") || k.startsWith("UN")) return "pnud";
  if (k.startsWith("UE") || k.includes("EUROP")) return "ue";
  if (k.startsWith("CF") || k.includes("FRAN")) return "cf";
  if (k.includes("ONU") || k.includes("UNICEF")) return "uni";
  return "fonds";
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
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
  let documents: Array<{
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
  }> = [];
  try {
    const docs = await TenderAPI.listDocuments({ projetId: projet.id }, token);
    documents = docs.documents ?? [];
  } catch { /* silencieux */ }

  const updateAction = updateAvancementAction.bind(null, projet.id);

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            {projet.reference}
            {projet.zone && <> · {projet.zone}</>}
            {projet.domaine !== "AUTRE" && <> · {DOMAINE_LABEL[projet.domaine]}</>}
          </div>
          <h1 className="pg-title">{projet.titre}</h1>
          {projet.description && <p className="pg-sub" style={{ maxWidth: "70ch" }}>{projet.description}</p>}
        </div>
        <div className="pg-actions">
          <Link href="/projets" className="btn btn--ghost btn--sm">
            <i className="ph ph-arrow-left"></i> Retour
          </Link>
          <button className="btn btn--secondary btn--sm">
            <i className="ph ph-pencil-simple"></i> Modifier
          </button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, marginTop: 28 }}>
        {/* Colonne principale */}
        <div style={{ display: "grid", gap: 24 }}>
          {/* Bloc avancement */}
          <div className="group-card">
            <div className="sec-head">
              <div>
                <h2>Avancement <em>en temps réel</em></h2>
                <p>Mettre à jour le pourcentage et l&apos;étape courante.</p>
              </div>
              <span className={`badge ${
                projet.statut === "ACTIF" ? "badge--review" :
                projet.statut === "ACHEVE" ? "badge--won" :
                projet.statut === "MONTAGE" ? "badge--draft" :
                "badge--lost"
              }`}>{STATUT_LABEL[projet.statut]}</span>
            </div>

            <form action={updateAction} style={{ display: "grid", gap: 16 }}>
              <div className="field-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
                <div className="field">
                  <label>Pourcentage</label>
                  <input
                    name="avancement"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={projet.avancement}
                  />
                </div>
                <div className="field">
                  <label>Étape (libellé libre)</label>
                  <input
                    name="etapeLabel"
                    defaultValue={projet.etapeLabel ?? ""}
                    placeholder="Ex : Note conceptuelle déposée"
                  />
                </div>
              </div>
              <div style={{ height: 4, background: "var(--color-canvas)", borderRadius: 2, overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${projet.avancement}%`, background: projet.statut === "ACHEVE" ? "var(--color-success)" : "var(--color-terracotta)" }}></span>
              </div>
              <div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-arrow-clockwise"></i> Mettre à jour
                </button>
              </div>
            </form>
          </div>

          {/* Bloc partenaires */}
          <div className="group-card">
            <div className="sec-head">
              <div>
                <h2>Partenaires <em>& équipe</em></h2>
                <p>Bailleurs financiers et équipiers affectés au projet.</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Bailleurs</div>
                {projet.bailleurs.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {projet.bailleurs.map((b) => (
                      <span key={b} className={`donor ${donorTone(b)}`} style={{ padding: "4px 10px", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>{b}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--color-shale)", fontSize: 13, margin: 0 }}>Aucun bailleur assigné</p>
                )}
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Équipe affectée</div>
                {projet.team.length > 0 ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    {projet.team.map((t) => (
                      <span key={t} className="avatar avatar--sm avatar--terracotta">{t}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--color-shale)", fontSize: 13, margin: 0 }}>Aucun équipier assigné</p>
                )}
              </div>
            </div>
          </div>

          {/* Bloc documents du projet */}
          <div className="group-card">
            <div className="sec-head">
              <div>
                <h2>Documents <em>du projet</em></h2>
                <p>
                  {documents.length === 0
                    ? "Aucun document attaché pour l'instant."
                    : `${documents.length} document${documents.length > 1 ? "s" : ""} attaché${documents.length > 1 ? "s" : ""}.`}
                </p>
              </div>
              <DocumentUploader
                projetId={projet.id}
                defaultCategory="PROJETS"
                defaultType="RAPPORT_ACTIVITE"
                buttonLabel="Téléverser"
                compact
              />
            </div>
            <DocumentList documents={documents} emptyMessage="Aucun document attaché. Utilisez le bouton ci-dessus pour téléverser le premier." />
          </div>

          {/* Sous-modules futurs */}
          <div className="group-card" style={{ background: "var(--color-canvas)" }}>
            <div className="sec-head">
              <div>
                <h2>Autres sous-modules <em>à venir</em></h2>
                <p>Budget détaillé et jalons / kanban dans les prochains chantiers.</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <Link href={`/projets/${projet.id}/budget`} className="doc-card">
                <span className="ic"><i className="ph ph-coins"></i></span>
                <span className="nm">Budget<em> détaillé</em><small>À implémenter (P1)</small></span>
                <i className="ph ph-arrow-up-right arrow"></i>
              </Link>
              <a className="doc-card">
                <span className="ic"><i className="ph ph-flag"></i></span>
                <span className="nm">Jalons<em> et tâches</em><small>Kanban à implémenter (P2)</small></span>
                <i className="ph ph-arrow-up-right arrow"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Colonne latérale : métadonnées */}
        <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="group-card">
            <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-stone)", fontWeight: 600, margin: "0 0 12px" }}>
              Référence & calendrier
            </h4>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 12px", margin: 0, fontSize: 13 }}>
              <dt style={{ color: "var(--color-sepia)" }}>Référence</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{projet.reference}</dd>
              <dt style={{ color: "var(--color-sepia)" }}>Statut</dt>
              <dd style={{ margin: 0 }}>{STATUT_LABEL[projet.statut]}</dd>
              <dt style={{ color: "var(--color-sepia)" }}>Échéance</dt>
              <dd style={{ margin: 0 }}>{projet.echeance ?? "—"}</dd>
              <dt style={{ color: "var(--color-sepia)" }}>Début</dt>
              <dd style={{ margin: 0 }}>{fmtDate(projet.dateDebut)}</dd>
              <dt style={{ color: "var(--color-sepia)" }}>Fin prévue</dt>
              <dd style={{ margin: 0 }}>{fmtDate(projet.dateFin)}</dd>
              {projet.dateCloture && (
                <>
                  <dt style={{ color: "var(--color-sepia)" }}>Clôturé le</dt>
                  <dd style={{ margin: 0 }}>{fmtDate(projet.dateCloture)}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="group-card">
            <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-stone)", fontWeight: 600, margin: "0 0 12px" }}>
              Budget
            </h4>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 12px", margin: 0, fontSize: 13 }}>
              <dt style={{ color: "var(--color-sepia)" }}>Estimé</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>
                {projet.budgetEstime ? `${new Intl.NumberFormat("fr-FR").format(projet.budgetEstime)} ${projet.devise}` : "—"}
              </dd>
              <dt style={{ color: "var(--color-sepia)" }}>Réalisé</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>
                {projet.budgetRealise ? `${new Intl.NumberFormat("fr-FR").format(projet.budgetRealise)} ${projet.devise}` : "—"}
              </dd>
              <dt style={{ color: "var(--color-sepia)" }}>Bénéficiaires</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>
                {projet.beneficiaires ?? "—"}
              </dd>
            </dl>
          </div>

          <div className="group-card">
            <h4 style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-stone)", fontWeight: 600, margin: "0 0 12px" }}>
              Historique
            </h4>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px 12px", margin: 0, fontSize: 13 }}>
              <dt style={{ color: "var(--color-sepia)" }}>Créé le</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11 }}>{fmtDate(projet.createdAt)}</dd>
              <dt style={{ color: "var(--color-sepia)" }}>Modifié</dt>
              <dd style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11 }}>{fmtDate(projet.updatedAt)}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
