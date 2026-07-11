import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

interface BailleurOpt {
  id: string;
  nom: string;
  sigle: string;
}

const TYPE_OPTIONS = [
  { v: "SUBVENTION", l: "Subvention (appel à propositions)" },
  { v: "MARCHE_SERVICE", l: "Marché de services" },
  { v: "MARCHE_TRAVAUX", l: "Marché de travaux" },
  { v: "MARCHE_FOURNITURES", l: "Marché de fournitures" },
  { v: "CONSULTATION", l: "Consultation" },
  { v: "ASSISTANCE_TECHNIQUE", l: "Assistance technique" },
  { v: "AUTRE", l: "Autre" },
];

async function createOpportuniteAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR") {
    throw new Error("Seuls ADMIN et DIRECTEUR peuvent saisir une opportunité.");
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) redirect("/opportunites/nouveau?err=titre");

  const body: Record<string, unknown> = {
    titre,
    sourceConnector: "MANUEL",
    description: String(formData.get("description") ?? "").trim() || null,
    secteur: String(formData.get("secteur") ?? "").trim() || null,
    typeFinancement: String(formData.get("typeFinancement") ?? "SUBVENTION"),
    bailleurId: String(formData.get("bailleurId") ?? "").trim() || null,
    bailleurNom: String(formData.get("bailleurNom") ?? "").trim() || null,
    devise: String(formData.get("devise") ?? "EUR"),
    region: String(formData.get("region") ?? "").trim() || null,
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null,
  };

  const montant = String(formData.get("montantEstime") ?? "").trim();
  if (montant) body.montantEstime = Number(montant);

  const pays = String(formData.get("paysCible") ?? "").trim();
  if (pays) body.paysCible = pays.split(",").map((p) => p.trim()).filter(Boolean);

  const tags = String(formData.get("tags") ?? "").trim();
  if (tags) body.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);

  const dateLimite = String(formData.get("dateLimiteDepot") ?? "").trim();
  if (dateLimite) body.dateLimiteDepot = new Date(dateLimite).toISOString();

  let createdId: string | null = null;
  try {
    const data = await TenderAPI.createOpportunite(body, token);
    createdId = data?.opportunite?.id ?? null;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "Erreur inconnue");
    redirect(`/opportunites/nouveau?err=${msg}`);
  }

  revalidatePath("/opportunites");
  if (createdId) redirect(`/opportunites/${createdId}`);
  redirect("/opportunites");
}

export default async function NouvelleOpportunitePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let bailleurs: BailleurOpt[] = [];
  try {
    const data = await TenderAPI.listBailleurs();
    bailleurs = (data.bailleurs ?? []).sort((a: BailleurOpt, b: BailleurOpt) => a.sigle.localeCompare(b.sigle));
  } catch { /* silencieux */ }

  const { err } = await searchParams;
  let errBanner: string | null = null;
  if (err === "titre") errBanner = "Le titre est obligatoire.";
  else if (err) errBanner = decodeURIComponent(err);

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            <Link href="/opportunites" style={{ color: "var(--color-stone)", textDecoration: "none" }}>
              <i className="ph ph-arrow-left"></i> Opportunités
            </Link>
            {" · Saisie manuelle"}
          </div>
          <h1 className="pg-title">
            Nouvelle <em>opportunité.</em>
          </h1>
          <p className="pg-sub">
            Saisissez une opportunité repérée par mail, sur un site bailleur ou via votre réseau. Pour les sources automatisables (TED, Sam.gov, ReliefWeb…), un connecteur les ramènera bientôt sans saisie manuelle.
          </p>
        </div>
      </header>

      {errBanner && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          <strong>Erreur :</strong> {errBanner}
        </div>
      )}

      <form action={createOpportuniteAction} className="card" style={{ marginTop: 24, padding: 24, display: "grid", gap: 18 }}>
        <div>
          <label htmlFor="titre" style={lbl}>
            Titre de l&apos;appel à propositions <span style={{ color: "var(--color-terracotta)" }}>*</span>
          </label>
          <input id="titre" name="titre" required placeholder="Ex : Appel à propositions WASH Sahel — UE/INTPA 2026"
            style={input} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label htmlFor="bailleurId" style={lbl}>Bailleur connu</label>
            <select id="bailleurId" name="bailleurId" style={input} defaultValue="">
              <option value="">— Sélectionner ou saisir libre ci-dessous —</option>
              {bailleurs.map((b) => (
                <option key={b.id} value={b.id}>{b.sigle} · {b.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bailleurNom" style={lbl}>Bailleur en texte libre</label>
            <input id="bailleurNom" name="bailleurNom" placeholder="Si pas dans la liste, ex : DG INTPA, Fondation Bill Gates…" style={input} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <div>
            <label htmlFor="secteur" style={lbl}>Secteur</label>
            <input id="secteur" name="secteur" placeholder="Ex : Eau et assainissement, Santé maternelle, Cohésion sociale…" style={input} />
          </div>
          <div>
            <label htmlFor="typeFinancement" style={lbl}>Type de financement</label>
            <select id="typeFinancement" name="typeFinancement" defaultValue="SUBVENTION" style={input}>
              {TYPE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" style={lbl}>Description / résumé</label>
          <textarea id="description" name="description" rows={5}
            placeholder="Objectifs, populations cibles, contraintes éligibilité, attentes du bailleur…"
            style={{ ...input, resize: "vertical" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label htmlFor="montantEstime" style={lbl}>Montant max</label>
            <input id="montantEstime" name="montantEstime" type="number" min="0" step="1000"
              placeholder="500000" style={{ ...input, fontFamily: "var(--font-mono)" }} />
          </div>
          <div>
            <label htmlFor="devise" style={lbl}>Devise</label>
            <select id="devise" name="devise" defaultValue="EUR" style={input}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="FCFA">FCFA</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateLimiteDepot" style={lbl}>Date limite de dépôt</label>
            <input id="dateLimiteDepot" name="dateLimiteDepot" type="datetime-local" style={input} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label htmlFor="paysCible" style={lbl}>Pays cible(s)</label>
            <input id="paysCible" name="paysCible" placeholder="TCD, Sahel, Afrique centrale… (séparés par virgules)" style={input} />
          </div>
          <div>
            <label htmlFor="region" style={lbl}>Région / zone</label>
            <input id="region" name="region" placeholder="Ex : Guéra, Batha, bassin du lac Tchad…" style={input} />
          </div>
        </div>

        <div>
          <label htmlFor="sourceUrl" style={lbl}>Lien vers l&apos;annonce</label>
          <input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" style={input} />
        </div>

        <div>
          <label htmlFor="tags" style={lbl}>Tags (mots-clés)</label>
          <input id="tags" name="tags" placeholder="Ex : eau, jeunesse, urgence (séparés par virgules)" style={input} />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid var(--color-line)", paddingTop: 16 }}>
          <Link href="/opportunites" className="btn btn--secondary">Annuler</Link>
          <button type="submit" className="btn btn--accent">
            <i className="ph ph-plus" aria-hidden="true"></i> Enregistrer l&apos;opportunité
          </button>
        </div>
      </form>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 6,
  color: "var(--color-stone)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
  border: "1px solid var(--color-line)",
  borderRadius: 4,
  fontFamily: "inherit",
  fontSize: 14,
  background: "var(--color-surface)",
};
