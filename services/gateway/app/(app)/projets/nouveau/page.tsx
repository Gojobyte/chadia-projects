import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ProjetWizard } from "./ProjetWizard";

async function createProjetAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) {
    throw new Error("Le titre est obligatoire.");
  }

  const bailleurs = String(formData.get("bailleurs") || "")
    .split(/[,;]/)
    .map((b) => b.trim())
    .filter(Boolean);

  const team = String(formData.get("team") || "")
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
    etapeLabel: String(formData.get("etapeLabel") || "") || null,
    avancement: 0,
  };

  const budget = formData.get("budgetEstime");
  if (budget) body.budgetEstime = Number(budget);

  const dateDebut = String(formData.get("dateDebut") || "");
  if (dateDebut) body.dateDebut = new Date(dateDebut).toISOString();

  const beneficiairesRaw = String(formData.get("beneficiaires") || "");
  // On extrait le premier nombre rencontré dans la chaîne de bénéficiaires
  // (ex. "2 400 ménages · 14 villages · 8 200 personnes" → 2400).
  if (beneficiairesRaw) {
    const match = beneficiairesRaw.replace(/\s/g, "").match(/(\d+)/);
    if (match) body.beneficiaires = Number(match[1]);
  }

  const created = await TenderAPI.createProjet(body, token);
  revalidatePath("/projets");
  redirect(`/projets/${created.projet.id}`);
}

export default async function NouveauProjetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  // Référence suggérée : on compte les projets de l'année courante pour
  // proposer PRJ-AAAA-NN. Si le call échoue, on tombe sur 01.
  const year = new Date().getFullYear();
  let nextNum = 1;
  try {
    const data = await TenderAPI.listProjets({}, token);
    const projets: Array<{ reference?: string | null }> = data.projets ?? [];
    const yearPrefix = `PRJ-${year}-`;
    const sameYear = projets.filter((p) => p.reference?.startsWith(yearPrefix));
    nextNum = sameYear.length + 1;
  } catch {
    /* silencieux — on garde nextNum = 1 */
  }
  const refSuggested = `PRJ-${year}-${String(nextNum).padStart(2, "0")}`;

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Création · projet ONG</div>
          <h1 className="pg-title">
            Nouveau <em>projet.</em>
          </h1>
          <p className="pg-sub">
            Démarrez un projet ONG à partir de zéro, d&apos;un appel d&apos;offres remporté ou d&apos;un modèle.
            CHADIA pré-remplit la fiche, le cadre logique et le budget à partir de la trame choisie.
          </p>
        </div>
      </header>

      <ProjetWizard refSuggested={refSuggested} createAction={createProjetAction} />
    </div>
  );
}
