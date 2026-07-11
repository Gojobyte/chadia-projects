import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthToken } from "@/lib/session-helpers";
import { SubmitButton } from "@/components/SubmitButton";

/** Profil organisation CHADIA — sert au matching d'éligibilité (P2-34).
 *  Persisté dans Setting key="org.profile" pour éviter une migration Prisma.
 *  Tous les champs textuels libres sont sérialisés en JSON. */
export interface OrgProfile {
  effectifs?: number;
  anneeCreation?: number;
  statutJuridique?: string;
  recepisseONG?: string;
  domaines?: string[];
  paysIntervention?: string[];
  bailleursReferences?: string[];
  budgetAnnuelEur?: number;
  experienceMoyenneAnnees?: number;
  agrements?: string[];
  partenairesRecurrents?: string[];
  descriptionLibre?: string;
}

const DEFAULT_PROFILE: OrgProfile = {
  effectifs: undefined,
  anneeCreation: undefined,
  statutJuridique: "",
  recepisseONG: "",
  domaines: [],
  paysIntervention: [],
  bailleursReferences: [],
  budgetAnnuelEur: undefined,
  experienceMoyenneAnnees: undefined,
  agrements: [],
  partenairesRecurrents: [],
  descriptionLibre: "",
};

async function saveProfileAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = getAuthToken(session);
  if (!token) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "DIRECTEUR") {
    throw new Error("Seuls l'admin et le directeur peuvent modifier le profil organisation.");
  }

  const num = (k: string): number | undefined => {
    const raw = formData.get(k);
    if (typeof raw !== "string" || !raw.trim()) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (k: string) => (typeof formData.get(k) === "string" ? String(formData.get(k)).trim() : "");
  const list = (k: string) =>
    str(k).split(",").map((s) => s.trim()).filter(Boolean);

  const profile: OrgProfile = {
    effectifs: num("effectifs"),
    anneeCreation: num("anneeCreation"),
    statutJuridique: str("statutJuridique"),
    recepisseONG: str("recepisseONG"),
    domaines: list("domaines"),
    paysIntervention: list("paysIntervention"),
    bailleursReferences: list("bailleursReferences"),
    budgetAnnuelEur: num("budgetAnnuelEur"),
    experienceMoyenneAnnees: num("experienceMoyenneAnnees"),
    agrements: list("agrements"),
    partenairesRecurrents: list("partenairesRecurrents"),
    descriptionLibre: str("descriptionLibre"),
  };

  // Garde-fou : si le payload est totalement vide (aucun champ numérique
  // ni textuel ni liste rempli), on refuse d'enregistrer pour éviter
  // d'écraser un profil existant avec du vide par erreur (placeholder confusion).
  const hasAnyData =
    profile.effectifs !== undefined ||
    profile.anneeCreation !== undefined ||
    profile.budgetAnnuelEur !== undefined ||
    profile.experienceMoyenneAnnees !== undefined ||
    (profile.statutJuridique?.trim().length ?? 0) > 0 ||
    (profile.recepisseONG?.trim().length ?? 0) > 0 ||
    (profile.descriptionLibre?.trim().length ?? 0) > 0 ||
    (profile.domaines?.length ?? 0) > 0 ||
    (profile.paysIntervention?.length ?? 0) > 0 ||
    (profile.bailleursReferences?.length ?? 0) > 0 ||
    (profile.agrements?.length ?? 0) > 0 ||
    (profile.partenairesRecurrents?.length ?? 0) > 0;
  if (!hasAnyData) {
    throw new Error("Aucun champ rempli — enregistrement annulé pour ne pas écraser le profil existant.");
  }

  await TenderAPI.updateSetting("org.profile", profile, token);
  revalidatePath("/organisation");
}

export default async function OrganisationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = getAuthToken(session);
  if (!token) redirect("/login");

  const role = session.user.role;
  const canEdit = role === "ADMIN" || role === "DIRECTEUR";

  let profile: OrgProfile = DEFAULT_PROFILE;
  try {
    const res = await TenderAPI.getSetting("org.profile", token);
    // L'API tender renvoie `{ setting: { key, value, ... } }`. Si on lit
    // directement `res.value` (ancien code), on rate la donnée → on retourne
    // un profil vide → l'utilisateur voit les placeholders → s'il enregistre,
    // ça écrase avec du vide. Bug latent qui a déjà flingué le profil une fois.
    const r = res as { setting?: { value?: unknown }; value?: unknown };
    const raw = r.setting?.value ?? r.value;
    if (raw && typeof raw === "object") {
      profile = { ...DEFAULT_PROFILE, ...(raw as OrgProfile) };
    }
  } catch {
    // 404 → setting jamais initialisé, on garde le défaut
  }

  // Score de complétude du profil : compte les champs renseignés. Permet
  // d'afficher un indicateur clair "X% complet" en haut de page pour que
  // l'utilisateur voie d'un coup d'œil l'état réel des données enregistrées
  // (et pas juste les placeholders).
  const filledCount = [
    profile.statutJuridique?.trim(),
    profile.recepisseONG?.trim(),
    profile.descriptionLibre?.trim(),
    profile.effectifs ? "x" : "",
    profile.anneeCreation ? "x" : "",
    profile.budgetAnnuelEur ? "x" : "",
    profile.experienceMoyenneAnnees ? "x" : "",
    (profile.domaines?.length ?? 0) > 0 ? "x" : "",
    (profile.paysIntervention?.length ?? 0) > 0 ? "x" : "",
    (profile.bailleursReferences?.length ?? 0) > 0 ? "x" : "",
    (profile.agrements?.length ?? 0) > 0 ? "x" : "",
    (profile.partenairesRecurrents?.length ?? 0) > 0 ? "x" : "",
  ].filter(Boolean).length;
  const completeness = Math.round((filledCount / 12) * 100);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 920, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-stone)", textTransform: "uppercase", marginBottom: 4 }}>
          Organisation · profil
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400, color: "var(--color-ink)", margin: 0 }}>
          Profil de <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>CHADIA</em>
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-sepia)", marginTop: 6, lineHeight: 1.5 }}>
          Ces informations servent à comparer automatiquement votre organisation aux critères d&apos;éligibilité
          de chaque appel à propositions analysé par l&apos;IA. Plus elles sont complètes, plus la vérification
          est précise.
        </p>

        {/* Indicateur de complétude — donne une vue d'ensemble immédiate
            de l'état des données enregistrées (et pas des placeholders). */}
        <div style={{ marginTop: 16, padding: "10px 14px", background: completeness >= 75 ? "var(--color-success-soft)" : completeness >= 30 ? "var(--color-warning-soft)" : "var(--color-danger-soft)", border: `1px solid ${completeness >= 75 ? "rgba(91,138,58,0.24)" : completeness >= 30 ? "rgba(237,108,2,0.24)" : "rgba(163,45,45,0.24)"}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <i
            className={completeness >= 75 ? "ph-fill ph-check-circle" : completeness >= 30 ? "ph-fill ph-warning-circle" : "ph-fill ph-x-circle"}
            style={{ fontSize: 22, color: completeness >= 75 ? "var(--color-success)" : completeness >= 30 ? "var(--color-warning)" : "var(--color-danger)" }}
            aria-hidden="true"
          ></i>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: completeness >= 75 ? "var(--color-success)" : completeness >= 30 ? "var(--color-warning)" : "var(--color-danger)" }}>
              Profil {completeness}% renseigné · {filledCount}/12 champs remplis
            </div>
            <div style={{ fontSize: 11, color: "var(--color-stone)", marginTop: 2 }}>
              {completeness >= 75
                ? "L'IA peut comparer précisément CHADIA aux critères d'éligibilité des appels d'offres."
                : completeness >= 30
                ? "Profil partiellement rempli. Complétez les champs vides pour améliorer l'analyse IA."
                : "Profil quasi vide. Remplissez le formulaire ci-dessous pour activer l'analyse d'éligibilité IA."}
            </div>
          </div>
          <div style={{ width: 80, height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
            <span style={{ display: "block", height: "100%", width: `${completeness}%`, background: completeness >= 75 ? "var(--color-success)" : completeness >= 30 ? "var(--color-warning)" : "var(--color-danger)" }}></span>
          </div>
        </div>
      </header>

      <form action={saveProfileAction} className="org-form">
        <section className="org-section">
          <h2>Identité &amp; statut</h2>
          <div className="org-grid">
            <Field label="Année de création" name="anneeCreation" type="number" defaultValue={profile.anneeCreation} placeholder="2021" />
            <Field label="Effectifs (équivalents temps plein)" name="effectifs" type="number" defaultValue={profile.effectifs} placeholder="8" />
            <Field label="Statut juridique" name="statutJuridique" defaultValue={profile.statutJuridique} placeholder="ONG de droit tchadien à but non lucratif" />
            <Field label="N° récépissé ONG" name="recepisseONG" defaultValue={profile.recepisseONG} placeholder="154/PCMT/PMT/MEPDCI/SE/SPONGAH/2021" />
            <Field label="Expérience moyenne sur projets bailleurs (ans)" name="experienceMoyenneAnnees" type="number" defaultValue={profile.experienceMoyenneAnnees} placeholder="4" />
            <Field label="Budget annuel moyen (EUR)" name="budgetAnnuelEur" type="number" defaultValue={profile.budgetAnnuelEur} placeholder="313000" />
          </div>
        </section>

        <section className="org-section">
          <h2>Capacités &amp; expérience</h2>
          <TagsField
            label="Domaines d'intervention"
            name="domaines"
            defaultValue={profile.domaines}
            placeholder="WASH, BTP, Entrepreneuriat, Formation professionnelle, Santé, Éducation, Agriculture & Élevage"
            hint="Séparés par des virgules. Mots-clés sectoriels que vous maîtrisez."
          />
          <TagsField
            label="Pays / régions d'intervention"
            name="paysIntervention"
            defaultValue={profile.paysIntervention}
            placeholder="Tchad, Niger, Rwanda, Côte d'Ivoire"
            hint="Pays où vous avez déjà mené des projets."
          />
          <TagsField
            label="Bailleurs déjà accompagnés"
            name="bailleursReferences"
            defaultValue={profile.bailleursReferences}
            placeholder="AUDA-NEPAD, Union Africaine, BADEA, FER, Ministère Santé Tchad, ONG Turc"
            hint="Sigles ou noms des bailleurs avec qui vous avez signé une convention."
          />
          <TagsField
            label="Agréments / certifications"
            name="agrements"
            defaultValue={profile.agrements}
            placeholder="Autorisation MEPDCI 2021, Comptabilité SYSCOHADA visée Atrio Consultance"
            hint="Tout document officiel reconnaissant votre capacité."
          />
          <TagsField
            label="Partenaires récurrents"
            name="partenairesRecurrents"
            defaultValue={profile.partenairesRecurrents}
            placeholder="AUDA-NEPAD, Solar Power Enterprise, BADEA, FER, Atrio Consultance"
            hint="Co-implementers avec qui vous travaillez régulièrement."
          />
        </section>

        <section className="org-section">
          <h2>Présentation libre</h2>
          <label className="org-fld">
            <span>Description courte (utilisée pour les contextes IA)</span>
            <textarea
              name="descriptionLibre"
              rows={6}
              defaultValue={profile.descriptionLibre}
              placeholder="CHADIA pour le Développement du Tchad (CDT) est une ONG de droit tchadien à but non lucratif, enregistrée le 08/12/2021 (N° 154/PCMT/PMT/MEPDCI/SE/SPONGAH/2021). Siège à N'Djamena (Quartier Kabalaye). Spécialisée en WASH, BTP, formation entrepreneuriale, santé et agriculture..."
            />
          </label>
        </section>

        {canEdit ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <SubmitButton className="btn btn--accent" icon="ph-floppy-disk" pendingLabel="Enregistrement…">
              Enregistrer le profil
            </SubmitButton>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--color-stone)", textAlign: "right" }}>
            Seuls l&apos;admin et le directeur peuvent modifier ce profil.
          </p>
        )}
      </form>

      <style>{`
        .org-form { display: flex; flex-direction: column; gap: 24px; }
        .org-section {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: 10px;
          padding: 20px 24px;
        }
        .org-section h2 {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 400;
          color: var(--color-ink);
          margin: 0 0 16px;
        }
        .org-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }
        .org-fld { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
        .org-fld span { color: var(--color-sepia); font-weight: 500; }
        .org-fld input, .org-fld textarea {
          width: 100%;
          padding: 8px 10px;
          font-family: inherit;
          font-size: 13px;
          color: var(--color-ink);
          background: var(--color-page);
          border: 1px solid var(--color-line);
          border-radius: 6px;
        }
        .org-fld input:focus, .org-fld textarea:focus {
          outline: none;
          border-color: var(--color-terracotta);
          box-shadow: 0 0 0 3px var(--color-terracotta-soft);
        }
        .org-fld textarea { resize: vertical; min-height: 80px; }
        .org-hint { font-size: 11px; color: var(--color-stone); margin-top: 2px; }
        :global(.btn--accent) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 16px;
          height: 38px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          color: #fff;
          background: var(--color-terracotta);
          border: 1px solid var(--color-terracotta);
          border-radius: 6px;
          cursor: pointer;
        }
        :global(.btn--accent:hover) { background: var(--color-terracotta-hover); }
      `}</style>
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, placeholder,
}: {
  label: string; name: string; type?: string;
  defaultValue?: string | number; placeholder?: string;
}) {
  return (
    <label className="org-fld">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </label>
  );
}

function TagsField({
  label, name, defaultValue, placeholder, hint,
}: {
  label: string; name: string; defaultValue?: string[];
  placeholder?: string; hint?: string;
}) {
  return (
    <label className="org-fld" style={{ marginTop: 12 }}>
      <span>{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={(defaultValue ?? []).join(", ")}
        placeholder={placeholder}
      />
      {hint ? <span className="org-hint">{hint}</span> : null}
    </label>
  );
}
