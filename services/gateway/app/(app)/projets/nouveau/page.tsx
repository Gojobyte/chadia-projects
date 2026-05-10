import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

const DOMAINES = [
  "URGENCE", "JEUNESSE", "GENRE", "FEMMES", "EDUCATION",
  "EAU", "SANTE", "COHESION", "FORMATION", "AGRICULTURE", "AUTRE",
] as const;
const DOMAINE_LABEL: Record<string, string> = {
  URGENCE: "Urgence", JEUNESSE: "Jeunesse", GENRE: "Genre",
  FEMMES: "Femmes", EDUCATION: "Éducation", EAU: "Eau",
  SANTE: "Santé", COHESION: "Cohésion sociale", FORMATION: "Formation",
  AGRICULTURE: "Agriculture", AUTRE: "Autre",
};

const STATUTS = ["MONTAGE", "ACTIF", "SUSPENDU"] as const;
const STATUT_LABEL: Record<string, string> = {
  MONTAGE: "En montage", ACTIF: "Actif", SUSPENDU: "Suspendu",
};

async function createProjetAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) return;

  const bailleursRaw = String(formData.get("bailleurs") || "");
  const bailleurs = bailleursRaw
    .split(/[,;]/)
    .map((b) => b.trim())
    .filter(Boolean);

  const teamRaw = String(formData.get("team") || "");
  const team = teamRaw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const body: Record<string, unknown> = {
    titre,
    description: String(formData.get("description") || "") || null,
    zone: String(formData.get("zone") || "") || null,
    domaine: String(formData.get("domaine") || "AUTRE"),
    statut: String(formData.get("statut") || "MONTAGE"),
    urgent: formData.get("urgent") === "on",
    bailleurs,
    team,
    echeance: String(formData.get("echeance") || "") || null,
    etapeLabel: String(formData.get("etapeLabel") || "") || null,
    avancement: Number(formData.get("avancement") || 0),
  };

  const budget = formData.get("budgetEstime");
  if (budget) body.budgetEstime = Number(budget);

  const created = await TenderAPI.createProjet(body, token);
  revalidatePath("/projets");
  redirect(`/projets/${created.projet.id}`);
}

export default async function NouveauProjetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Création</div>
          <h1 className="pg-title">Nouveau <em>projet</em></h1>
          <p className="pg-sub">
            La référence du projet (PRJ-{new Date().getFullYear()}-XX) est générée automatiquement à la création. Tous les champs peuvent être édités ensuite.
          </p>
        </div>
        <div className="pg-actions">
          <Link href="/projets" className="btn btn--ghost btn--sm">
            <i className="ph ph-arrow-left"></i> Retour
          </Link>
        </div>
      </header>

      <form action={createProjetAction} style={{ display: "grid", gap: 24, maxWidth: 880, marginTop: 24 }}>
        <div className="group-card">
          <div className="sec-head">
            <div>
              <h2>Identité <em>du projet</em></h2>
              <p>Informations principales — affichées dans la liste et sur les rapports.</p>
            </div>
          </div>
          <div className="field-grid">
            <div className="field full">
              <label>Titre du projet <span className="req">*</span></label>
              <input name="titre" required placeholder="Ex : Réhabilitation de 8 forages communautaires" />
            </div>
            <div className="field full">
              <label>Description</label>
              <textarea name="description" rows={4} placeholder="Objectifs, méthodologie, bénéficiaires attendus…"></textarea>
            </div>
            <div className="field">
              <label>Zone d&apos;intervention</label>
              <input name="zone" placeholder="Ex : Mongo, Guéra" />
            </div>
            <div className="field">
              <label>Domaine</label>
              <select name="domaine" defaultValue="AUTRE">
                {DOMAINES.map((d) => (
                  <option key={d} value={d}>{DOMAINE_LABEL[d]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Statut initial</label>
              <select name="statut" defaultValue="MONTAGE">
                {STATUTS.map((s) => (
                  <option key={s} value={s}>{STATUT_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Échéance (libellé) <small>Ex : "Clôture 30 sept.", "Échéance dans 18j"</small></label>
              <input name="echeance" placeholder="Clôture · 30 sept. 2027" />
            </div>
            <div className="field full">
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" name="urgent" />
                Projet urgent (s&apos;affiche en haut de la liste avec accent terra cotta)
              </label>
            </div>
          </div>
        </div>

        <div className="group-card">
          <div className="sec-head">
            <div>
              <h2>Partenaires <em>& équipe</em></h2>
              <p>Sigles bailleurs séparés par virgule. Initiales équipiers (2 lettres) séparées par virgule.</p>
            </div>
          </div>
          <div className="field-grid">
            <div className="field">
              <label>Bailleurs (sigles)</label>
              <input name="bailleurs" placeholder="UE, PNUD, CF" />
            </div>
            <div className="field">
              <label>Équipe (initiales)</label>
              <input name="team" placeholder="AS, MM, FH" />
            </div>
            <div className="field">
              <label>Budget estimé (FCFA)</label>
              <input name="budgetEstime" type="number" min={0} step={1000} placeholder="0" />
            </div>
            <div className="field">
              <label>Avancement initial (%)</label>
              <input name="avancement" type="number" min={0} max={100} defaultValue={0} />
            </div>
            <div className="field full">
              <label>Étape (pour projets en montage) <small>Ex : "Note conceptuelle déposée", "Recherche bailleur"</small></label>
              <input name="etapeLabel" placeholder="Recherche bailleur" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Link href="/projets" className="btn btn--ghost">Annuler</Link>
          <button type="submit" className="btn btn--accent">
            <i className="ph ph-floppy-disk"></i> Créer le projet
          </button>
        </div>
      </form>
    </div>
  );
}
