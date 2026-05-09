import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

async function createFournisseur(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const expertiseRaw = String(formData.get("domainesExpertise") ?? "").trim();
  const certificationsRaw = String(formData.get("certifications") ?? "").trim();

  const body: Record<string, unknown> = {
    raisonSociale: String(formData.get("raisonSociale") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    sigle: String(formData.get("sigle") ?? "").trim() || undefined,
    categorie: String(formData.get("categorie") ?? "ENTREPRISE_INDIVIDUELLE"),
    telephone: String(formData.get("telephone") ?? "").trim() || undefined,
    adresse: String(formData.get("adresse") ?? "").trim() || undefined,
    ville: String(formData.get("ville") ?? "").trim() || undefined,
    pays: String(formData.get("pays") ?? "Tchad").trim() || "Tchad",
    siteWeb: String(formData.get("siteWeb") ?? "").trim() || undefined,
    representantNom: String(formData.get("representantNom") ?? "").trim() || undefined,
    representantTitre: String(formData.get("representantTitre") ?? "").trim() || undefined,
    numeroRccm: String(formData.get("numeroRccm") ?? "").trim() || undefined,
    numeroNif: String(formData.get("numeroNif") ?? "").trim() || undefined,
    anneesExperience: formData.get("anneesExperience") ? Number(formData.get("anneesExperience")) : undefined,
    effectif: formData.get("effectif") ? Number(formData.get("effectif")) : undefined,
    domainesExpertise: expertiseRaw ? expertiseRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
    certifications: certificationsRaw ? certificationsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
  };

  const data = await TenderAPI.createFournisseur(body, token);
  redirect(`/fournisseurs/${data.fournisseur.id}`);
}

export default async function NouveauFournisseurPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inscription</div>
          <h1 className="page-title">Nouveau <em>fournisseur</em></h1>
          <p className="page-subtitle">
            Inscrivez une entreprise, ONG ou consultant qui pourra ensuite soumissionner aux appels d&apos;offres. Le statut de vérification se fait dans un second temps.
          </p>
        </div>
      </div>

      <form action={createFournisseur} className="card" style={{ padding: 32, display: "grid", gap: 24, maxWidth: 880 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16, color: "var(--color-ink)" }}>Identité</div>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="field">
              <label htmlFor="raisonSociale" className="field-label">
                Raison sociale <span className="req">*</span>
              </label>
              <input id="raisonSociale" name="raisonSociale" type="text" required className="input" placeholder="BTP Sahel SARL" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              <div className="field">
                <label htmlFor="sigle" className="field-label">Sigle</label>
                <input id="sigle" name="sigle" type="text" className="input" placeholder="BTP-S" />
              </div>
              <div className="field">
                <label htmlFor="categorie" className="field-label">Catégorie <span className="req">*</span></label>
                <div className="select-wrap">
                  <select id="categorie" name="categorie" required className="select" defaultValue="SARL">
                    <option value="ENTREPRISE_INDIVIDUELLE">Entreprise individuelle</option>
                    <option value="SARL">SARL</option>
                    <option value="SA">SA</option>
                    <option value="ONG_NATIONALE">ONG nationale</option>
                    <option value="ONG_INTERNATIONALE">ONG internationale</option>
                    <option value="COOPERATIVE">Coopérative</option>
                    <option value="CONSORTIUM">Consortium</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label htmlFor="numeroRccm" className="field-label">Numéro RCCM</label>
                <input id="numeroRccm" name="numeroRccm" type="text" className="input mono" placeholder="TD-NDJ-2024-A-XXXX" />
              </div>
              <div className="field">
                <label htmlFor="numeroNif" className="field-label">Numéro NIF</label>
                <input id="numeroNif" name="numeroNif" type="text" className="input mono" placeholder="P-XXXXXXXX-X" />
              </div>
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: 0 }} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 16, color: "var(--color-ink)" }}>Contact</div>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label htmlFor="email" className="field-label">Email <span className="req">*</span></label>
                <input id="email" name="email" type="email" required className="input" placeholder="contact@btp-sahel.td" />
              </div>
              <div className="field">
                <label htmlFor="telephone" className="field-label">Téléphone</label>
                <input id="telephone" name="telephone" type="tel" className="input" placeholder="+235 XX XX XX XX" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="siteWeb" className="field-label">Site web</label>
              <input id="siteWeb" name="siteWeb" type="url" className="input" placeholder="https://www.exemple.org" />
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: 0 }} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 16, color: "var(--color-ink)" }}>Adresse</div>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="field">
              <label htmlFor="adresse" className="field-label">Adresse</label>
              <input id="adresse" name="adresse" type="text" className="input" placeholder="Avenue Mobutu, BP 1234" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label htmlFor="ville" className="field-label">Ville</label>
                <input id="ville" name="ville" type="text" className="input" placeholder="NDjamena" />
              </div>
              <div className="field">
                <label htmlFor="pays" className="field-label">Pays</label>
                <input id="pays" name="pays" type="text" className="input" defaultValue="Tchad" />
              </div>
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: 0 }} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 16, color: "var(--color-ink)" }}>Représentant légal</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field">
              <label htmlFor="representantNom" className="field-label">Nom</label>
              <input id="representantNom" name="representantNom" type="text" className="input" placeholder="Adoum Hassan" />
            </div>
            <div className="field">
              <label htmlFor="representantTitre" className="field-label">Titre / fonction</label>
              <input id="representantTitre" name="representantTitre" type="text" className="input" placeholder="Directeur général" />
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: 0 }} />

        <div>
          <div className="eyebrow" style={{ marginBottom: 16, color: "var(--color-ink)" }}>Activité</div>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="field">
              <label htmlFor="domainesExpertise" className="field-label">Domaines d&apos;expertise</label>
              <input id="domainesExpertise" name="domainesExpertise" type="text" className="input" placeholder="Construction, hydraulique, formation" />
              <span className="field-hint">Séparés par des virgules.</span>
            </div>
            <div className="field">
              <label htmlFor="certifications" className="field-label">Certifications</label>
              <input id="certifications" name="certifications" type="text" className="input" placeholder="ISO 9001, ISO 14001" />
              <span className="field-hint">Séparées par des virgules.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field">
                <label htmlFor="anneesExperience" className="field-label">Années d&apos;expérience</label>
                <input id="anneesExperience" name="anneesExperience" type="number" min="0" className="input tabular-nums" placeholder="12" />
              </div>
              <div className="field">
                <label htmlFor="effectif" className="field-label">Effectif</label>
                <input id="effectif" name="effectif" type="number" min="0" className="input tabular-nums" placeholder="45" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 20, borderTop: "1px solid var(--color-line)" }}>
          <Link href="/fournisseurs" className="btn btn--ghost">Annuler</Link>
          <button type="submit" className="btn btn--primary">
            <i className="ph ph-floppy-disk" aria-hidden="true"></i>
            Inscrire le fournisseur
          </button>
        </div>
      </form>
    </>
  );
}
