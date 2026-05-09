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
      <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
        Vous devez être ADMIN ou DIRECTEUR pour créer un appel d&apos;offre.
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

  const inputStyle = { padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface)", color: "var(--text)", width: "100%", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Nouvel appel d&apos;offre</div>
          <div className="page-subtitle">Créer un appel d&apos;offre. Une référence sera générée automatiquement.</div>
        </div>
      </div>

      {bailleursError && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--danger-soft, #fee)", color: "var(--danger)" }}>
          Service tender : {bailleursError}
        </div>
      )}

      <form action={createAppelOffre} className="card" style={{ padding: 24, display: "grid", gap: 16, maxWidth: 760 }}>
        <div>
          <label htmlFor="titre" style={labelStyle}>Titre *</label>
          <input id="titre" name="titre" type="text" required style={inputStyle} placeholder="Construction d&apos;un centre de santé à NDjamena" />
        </div>

        <div>
          <label htmlFor="description" style={labelStyle}>Description *</label>
          <textarea id="description" name="description" required rows={5} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} placeholder="Décrivez l&apos;objet de l&apos;appel d&apos;offre, le contexte, les attendus..." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="bailleurId" style={labelStyle}>Bailleur *</label>
            <select id="bailleurId" name="bailleurId" required style={inputStyle} defaultValue="">
              <option value="" disabled>Sélectionner un bailleur</option>
              {bailleurs.map(b => <option key={b.id} value={b.id}>{b.sigle} — {b.nom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="type" style={labelStyle}>Type</label>
            <select id="type" name="type" style={inputStyle} defaultValue="APPEL_OFFRES_OUVERT">
              <option value="APPEL_OFFRES_OUVERT">Appel d&apos;offres ouvert</option>
              <option value="APPEL_OFFRES_RESTREINT">Appel d&apos;offres restreint</option>
              <option value="MARCHE_NEGOCIE">Marché négocié</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="GRE_A_GRE">Gré à gré</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="categorie" style={labelStyle}>Catégorie</label>
            <select id="categorie" name="categorie" style={inputStyle} defaultValue="SERVICES">
              <option value="TRAVAUX">Travaux</option>
              <option value="FOURNITURES">Fournitures</option>
              <option value="SERVICES">Services</option>
              <option value="MIXTE">Mixte</option>
            </select>
          </div>
          <div>
            <label htmlFor="secteur" style={labelStyle}>Secteur</label>
            <input id="secteur" name="secteur" type="text" style={inputStyle} placeholder="Santé, éducation, agriculture..." />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="budgetEstime" style={labelStyle}>Budget estimé</label>
            <input id="budgetEstime" name="budgetEstime" type="number" min="0" step="1000" style={inputStyle} placeholder="50000000" />
          </div>
          <div>
            <label htmlFor="devise" style={labelStyle}>Devise</label>
            <select id="devise" name="devise" style={inputStyle} defaultValue="FCFA">
              <option value="FCFA">FCFA</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateLimiteDepot" style={labelStyle}>Date limite *</label>
            <input id="dateLimiteDepot" name="dateLimiteDepot" type="date" required style={inputStyle} />
          </div>
        </div>

        <div>
          <label htmlFor="lieuExecution" style={labelStyle}>Lieu d&apos;exécution</label>
          <input id="lieuExecution" name="lieuExecution" type="text" style={inputStyle} placeholder="NDjamena, Tchad" />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <a href="/appels-offres" className="btn btn-secondary">Annuler</a>
          <button type="submit" className="btn btn-primary">Créer le brouillon</button>
        </div>
      </form>
    </>
  );
}
