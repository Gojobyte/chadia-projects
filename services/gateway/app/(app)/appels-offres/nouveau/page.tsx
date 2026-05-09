import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";

interface Bailleur { id: string; nom: string; sigle: string }

async function createAppelOffre(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const body = {
    titre: String(formData.get("titre") ?? ""),
    description: String(formData.get("description") ?? ""),
    bailleurId: String(formData.get("bailleurId") ?? ""),
    type: String(formData.get("type") ?? "APPEL_OFFRES_OUVERT"),
    categorie: String(formData.get("categorie") ?? "SERVICES"),
    secteur: String(formData.get("secteur") ?? "") || undefined,
    budgetEstime: formData.get("budgetEstime") ? Number(formData.get("budgetEstime")) : undefined,
    devise: String(formData.get("devise") ?? "FCFA"),
    dateLimiteDepot: String(formData.get("dateLimiteDepot") ?? ""),
    lieuExecution: String(formData.get("lieuExecution") ?? "") || undefined,
  };

  const data = await TenderAPI.createAppelOffre(body, token);
  redirect(`/appels-offres/${data.appelOffre.id}`);
}

export default async function NouveauAppelOffrePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "ADMIN" && session.user.role !== "DIRECTEUR") {
    return (
      <div className="empty">
        <div className="ic"><i className="ph ph-lock-key" aria-hidden="true"></i></div>
        <h3 className="t">Accès <em>réservé</em></h3>
        <p className="s">Seuls les rôles ADMIN ou DIRECTEUR peuvent créer un appel d&apos;offre.</p>
      </div>
    );
  }

  let bailleurs: Bailleur[] = [];
  let bailleursError: string | null = null;
  try {
    const data = await TenderAPI.listBailleurs();
    bailleurs = data.bailleurs ?? [];
  } catch (e) {
    bailleursError = e instanceof Error ? e.message : "Erreur de chargement des bailleurs";
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Création</div>
          <h1 className="page-title">Nouvel appel d&apos;<em>offre</em></h1>
          <p className="page-subtitle">
            Renseignez les informations principales. La référence sera générée automatiquement et l&apos;appel pourra être publié plus tard.
          </p>
        </div>
      </div>

      {bailleursError && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {bailleursError}
        </div>
      )}

      <form action={createAppelOffre} className="card" style={{ padding: 32, display: "grid", gap: 20, maxWidth: 820 }}>
        <div className="field">
          <label htmlFor="titre" className="field-label">
            Titre de l&apos;appel d&apos;offre <span className="req">*</span>
          </label>
          <input
            id="titre"
            name="titre"
            type="text"
            required
            className="input"
            placeholder="Construction d'un centre de santé à NDjamena"
          />
        </div>

        <div className="field">
          <label htmlFor="description" className="field-label">
            Description <span className="req">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            className="textarea"
            placeholder="Décrivez l'objet de l'appel d'offre, le contexte, les attendus, les critères qualifiants…"
          />
          <span className="field-hint">Cette description sera publique au moment de la publication.</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label htmlFor="bailleurId" className="field-label">Bailleur <span className="req">*</span></label>
            <div className="select-wrap">
              <select id="bailleurId" name="bailleurId" required className="select" defaultValue="">
                <option value="" disabled>Sélectionner un bailleur</option>
                {bailleurs.map((b) => (
                  <option key={b.id} value={b.id}>{b.sigle} — {b.nom}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="type" className="field-label">Type</label>
            <div className="select-wrap">
              <select id="type" name="type" className="select" defaultValue="APPEL_OFFRES_OUVERT">
                <option value="APPEL_OFFRES_OUVERT">Appel d&apos;offres ouvert</option>
                <option value="APPEL_OFFRES_RESTREINT">Appel d&apos;offres restreint</option>
                <option value="MARCHE_NEGOCIE">Marché négocié</option>
                <option value="CONSULTATION">Consultation</option>
                <option value="GRE_A_GRE">Gré à gré</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field">
            <label htmlFor="categorie" className="field-label">Catégorie</label>
            <div className="select-wrap">
              <select id="categorie" name="categorie" className="select" defaultValue="SERVICES">
                <option value="TRAVAUX">Travaux</option>
                <option value="FOURNITURES">Fournitures</option>
                <option value="SERVICES">Services</option>
                <option value="MIXTE">Mixte</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="secteur" className="field-label">Secteur</label>
            <input id="secteur" name="secteur" type="text" className="input" placeholder="Santé, éducation, agriculture…" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
          <div className="field">
            <label htmlFor="budgetEstime" className="field-label">Budget estimé</label>
            <input
              id="budgetEstime"
              name="budgetEstime"
              type="number"
              min="0"
              step="1000"
              className="input tabular-nums"
              placeholder="50 000 000"
            />
          </div>
          <div className="field">
            <label htmlFor="devise" className="field-label">Devise</label>
            <div className="select-wrap">
              <select id="devise" name="devise" className="select" defaultValue="FCFA">
                <option value="FCFA">FCFA</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="dateLimiteDepot" className="field-label">Date limite <span className="req">*</span></label>
            <input id="dateLimiteDepot" name="dateLimiteDepot" type="date" required className="input" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="lieuExecution" className="field-label">Lieu d&apos;exécution</label>
          <input id="lieuExecution" name="lieuExecution" type="text" className="input" placeholder="NDjamena, Tchad" />
          <span className="field-hint">Optionnel. Précisez la zone géographique du marché si pertinent.</span>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, paddingTop: 20, borderTop: "1px solid var(--color-line)" }}>
          <a href="/appels-offres" className="btn btn--ghost">Annuler</a>
          <button type="submit" className="btn btn--primary">
            <i className="ph ph-floppy-disk" aria-hidden="true"></i>
            Créer le brouillon
          </button>
        </div>
      </form>
    </>
  );
}
