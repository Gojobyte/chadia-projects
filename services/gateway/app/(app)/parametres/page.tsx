import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const NAV = [
  { section: "Organisation", items: [
    { href: "#identite", icon: "ph-buildings", label: "Identité juridique" },
    { href: "#branding", icon: "ph-palette", label: "Branding" },
    { href: "#contact", icon: "ph-address-book", label: "Contact" },
  ]},
  { section: "Cycle des marchés", items: [
    { href: "#workflow", icon: "ph-megaphone", label: "Workflow AO" },
    { href: "#numerotation", icon: "ph-hash", label: "Numérotation" },
  ]},
  { section: "Intégrations", items: [
    { href: "#integ", icon: "ph-plug", label: "Services tiers" },
  ]},
];

interface SettingMap {
  [key: string]: unknown;
}

// ---------------------------------------------------------------------
// Server Actions par section
// ---------------------------------------------------------------------
async function saveSection(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const entries: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof key !== "string" || !key.includes(".")) continue;
    if (key.startsWith("__")) continue;
    // Les checkboxes envoient "on" si cochées, absentes sinon
    if (key.endsWith("[bool]")) {
      const realKey = key.replace(/\[bool\]$/, "");
      entries[realKey] = value === "on" || value === "true";
    } else {
      entries[key] = String(value);
    }
  }
  // Traiter aussi les booleans déclarés explicitement (presence/absence)
  const allKeys = Array.from(formData.keys());
  for (const k of allKeys) {
    if (k.startsWith("__bool:")) {
      const realKey = k.slice("__bool:".length);
      entries[realKey] = formData.get(k) === "on";
    }
  }

  await TenderAPI.updateSettings(entries, token);
  revalidatePath("/parametres");
}

// ---------------------------------------------------------------------
// Helpers : récupérer une valeur typée depuis le map
// ---------------------------------------------------------------------
function getStr(m: SettingMap, k: string, def = ""): string {
  const v = m[k];
  return typeof v === "string" ? v : def;
}
function getBool(m: SettingMap, k: string, def = false): boolean {
  const v = m[k];
  return typeof v === "boolean" ? v : def;
}
function getIntegration(m: SettingMap, k: string): { active: boolean; [key: string]: unknown } {
  const v = m[k];
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as { active: boolean; [key: string]: unknown };
  }
  return { active: false };
}

// ---------------------------------------------------------------------
// Composants section
// ---------------------------------------------------------------------
function ToggleField({ name, label, description, defaultChecked }: { name: string; label: string; description?: string; defaultChecked: boolean }) {
  return (
    <label className="row-tog" style={{ cursor: "pointer" }}>
      <input
        type="checkbox"
        name={`__bool:${name}`}
        defaultChecked={defaultChecked}
        style={{ display: "none" }}
      />
      <div className="body">
        <strong>{label}</strong>
        {description && <p>{description}</p>}
      </div>
      <span className={`switch ${defaultChecked ? "on" : ""}`} aria-hidden="true"></span>
    </label>
  );
}

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  let map: SettingMap = {};
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listSettings(token);
    map = data.map ?? {};
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const bsic = getIntegration(map, "integration.bsic");
  const gmail = getIntegration(map, "integration.gmail");
  const calcom = getIntegration(map, "integration.calcom");
  const hetzner = getIntegration(map, "integration.hetzner_storage");
  const docusign = getIntegration(map, "integration.docusign");
  const plausible = getIntegration(map, "integration.plausible");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Profil ONG · workflow · intégrations</div>
          <h1 className="pg-title">Para<em>mètres.</em></h1>
          <p className="pg-sub">
            Identité juridique, branding, workflow des marchés et services tiers. Chaque section a son propre bouton de sauvegarde. Toutes les modifications sont stockées dans le service tender.
          </p>
        </div>
        <div className="pg-actions">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
            {errorMsg ? <span style={{ color: "var(--color-danger)" }}>{errorMsg}</span> : "Données live · DB tender"}
          </span>
        </div>
      </header>

      <div className="pr-layout">
        <nav className="pr-tree">
          {NAV.map((g) => (
            <div key={g.section}>
              <h4>{g.section}</h4>
              {g.items.map((it) => (
                <a key={it.href} href={it.href}>
                  <i className={`ph ${it.icon}`}></i> {it.label}
                </a>
              ))}
              <div className="sep"></div>
            </div>
          ))}
        </nav>

        <div>
          {/* ---------- IDENTITÉ JURIDIQUE ---------- */}
          <section className="sec" id="identite">
            <form action={saveSection}>
              <div className="sec-head">
                <div>
                  <h2>Identité <em>juridique</em></h2>
                  <p>Informations officielles déclarées au ministère de l&apos;Administration du territoire.</p>
                </div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-floppy-disk"></i> Enregistrer cette section
                </button>
              </div>

              <div className="group-card">
                <div className="field-grid">
                  <div className="field">
                    <label>Dénomination officielle <span className="req">*</span></label>
                    <input name="org.denomination" defaultValue={getStr(map, "org.denomination")} required />
                  </div>
                  <div className="field">
                    <label>Sigle</label>
                    <input name="org.sigle" defaultValue={getStr(map, "org.sigle")} />
                  </div>
                  <div className="field">
                    <label>Forme juridique</label>
                    <input name="org.forme_juridique" defaultValue={getStr(map, "org.forme_juridique")} />
                  </div>
                  <div className="field">
                    <label>N° de récépissé</label>
                    <input name="org.recipisse" defaultValue={getStr(map, "org.recipisse")} />
                  </div>
                  <div className="field">
                    <label>Date de fondation</label>
                    <input name="org.date_fondation" defaultValue={getStr(map, "org.date_fondation")} />
                  </div>
                  <div className="field">
                    <label>NIF (numéro fiscal)</label>
                    <input name="org.nif" defaultValue={getStr(map, "org.nif")} />
                  </div>
                  <div className="field">
                    <label>Régime fiscal</label>
                    <input name="org.regime_fiscal" defaultValue={getStr(map, "org.regime_fiscal")} />
                  </div>
                  <div className="field full">
                    <label>Mission statutaire</label>
                    <textarea name="org.mission" defaultValue={getStr(map, "org.mission")} rows={4}></textarea>
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* ---------- BRANDING ---------- */}
          <section className="sec" id="branding">
            <form action={saveSection}>
              <div className="sec-head">
                <div>
                  <h2>Branding <em>&amp; signature</em></h2>
                  <p>Sigle, couleur d&apos;accent et mention apparaissant sur les documents PDF.</p>
                </div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-floppy-disk"></i> Enregistrer
                </button>
              </div>

              <div className="group-card">
                <div className="branding">
                  <div className="logo-up">
                    <div className="mark">C</div>
                  </div>
                  <div className="field-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="field">
                      <label>Sigle court (sidebar)</label>
                      <input name="branding.sigle_court" defaultValue={getStr(map, "branding.sigle_court")} />
                    </div>
                    <div className="field">
                      <label>Couleur d&apos;accent</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 36, height: 36, borderRadius: 4, background: getStr(map, "branding.couleur_accent", "#B85C3A"), border: "1px solid var(--color-line-strong)" }}></span>
                        <input name="branding.couleur_accent" defaultValue={getStr(map, "branding.couleur_accent")} />
                      </div>
                    </div>
                    <div className="field full">
                      <label>Mention de bas de page PDF</label>
                      <input name="branding.mention_footer" defaultValue={getStr(map, "branding.mention_footer")} />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* ---------- CONTACT ---------- */}
          <section className="sec" id="contact">
            <form action={saveSection}>
              <div className="sec-head">
                <div>
                  <h2>Contact <em>officiel</em></h2>
                  <p>Coordonnées affichées sur le site public et utilisées pour les courriers automatiques.</p>
                </div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-floppy-disk"></i> Enregistrer
                </button>
              </div>

              <div className="group-card">
                <div className="field-grid">
                  <div className="field full">
                    <label>Adresse postale</label>
                    <input name="contact.adresse" defaultValue={getStr(map, "contact.adresse")} />
                  </div>
                  <div className="field">
                    <label>Boîte postale</label>
                    <input name="contact.bp" defaultValue={getStr(map, "contact.bp")} />
                  </div>
                  <div className="field">
                    <label>E-mail officiel</label>
                    <input type="email" name="contact.email" defaultValue={getStr(map, "contact.email")} />
                  </div>
                  <div className="field">
                    <label>Téléphone principal</label>
                    <input name="contact.telephone_1" defaultValue={getStr(map, "contact.telephone_1")} />
                  </div>
                  <div className="field">
                    <label>Téléphone secondaire</label>
                    <input name="contact.telephone_2" defaultValue={getStr(map, "contact.telephone_2")} />
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* ---------- WORKFLOW ---------- */}
          <section className="sec" id="workflow">
            <form action={saveSection}>
              <div className="sec-head">
                <div>
                  <h2>Workflow <em>des marchés</em></h2>
                  <p>Règles automatiques appliquées à chaque appel d&apos;offres.</p>
                </div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-floppy-disk"></i> Enregistrer
                </button>
              </div>

              <div className="group-card">
                <ToggleField
                  name="workflow.publication_auto"
                  label="Publication automatique sur le registre public"
                  description="Les appels d'offres validés sont publiés dans l'heure sur la page /marches publique."
                  defaultChecked={getBool(map, "workflow.publication_auto", true)}
                />
                <ToggleField
                  name="workflow.notification_fournisseurs"
                  label="Notification automatique des fournisseurs ciblés"
                  description="Envoi par e-mail aux fournisseurs catégorisés par lot. Configurable par AO."
                  defaultChecked={getBool(map, "workflow.notification_fournisseurs", true)}
                />
                <ToggleField
                  name="workflow.verrouillage_plis"
                  label="Verrouillage des plis avant ouverture"
                  description="Soumissions chiffrées jusqu'à la séance d'ouverture officielle. Aucun membre ne peut consulter avant."
                  defaultChecked={getBool(map, "workflow.verrouillage_plis", true)}
                />
                <ToggleField
                  name="workflow.double_validation"
                  label="Double validation avant attribution"
                  description="Toute attribution requiert la signature électronique du DG et du Président du comité de dépouillement."
                  defaultChecked={getBool(map, "workflow.double_validation", true)}
                />
                <ToggleField
                  name="workflow.pv_auto"
                  label="Génération automatique du PV de séance (bêta)"
                  description="Pré-remplit le procès-verbal à partir des montants saisis. À valider manuellement avant signature."
                  defaultChecked={getBool(map, "workflow.pv_auto", false)}
                />
              </div>
            </form>
          </section>

          {/* ---------- NUMEROTATION ---------- */}
          <section className="sec" id="numerotation">
            <form action={saveSection}>
              <div className="sec-head">
                <div>
                  <h2>Numérotation <em>des références</em></h2>
                  <p>Formats utilisés pour générer automatiquement les références AO, soumissions et projets.</p>
                </div>
                <button type="submit" className="btn btn--accent btn--sm">
                  <i className="ph ph-floppy-disk"></i> Enregistrer
                </button>
              </div>

              <div className="group-card">
                <div className="field-grid">
                  <div className="field">
                    <label>Format référence AO</label>
                    <input name="numerotation.format_ao" defaultValue={getStr(map, "numerotation.format_ao")} />
                    <span className="help">Tokens : {"{ANNEE}, {NUM:3}, {MOIS}"}</span>
                  </div>
                  <div className="field">
                    <label>Format référence Soumission</label>
                    <input name="numerotation.format_soumission" defaultValue={getStr(map, "numerotation.format_soumission")} />
                    <span className="help">{"{NUM_AO}"} renvoie au compteur de l&apos;AO parent</span>
                  </div>
                  <div className="field">
                    <label>Format référence Projet</label>
                    <input name="numerotation.format_projet" defaultValue={getStr(map, "numerotation.format_projet")} />
                    <span className="help">Tokens : {"{ANNEE}, {NUM:2}"}</span>
                  </div>
                  <div className="field">
                    <label>Année comptable</label>
                    <input name="numerotation.annee_comptable" defaultValue={getStr(map, "numerotation.annee_comptable")} />
                    <span className="help">Format : MM-JJ_MM-JJ (ex: 01-01_31-12)</span>
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* ---------- INTEGRATIONS ---------- */}
          <section className="sec" id="integ">
            <div className="sec-head">
              <div>
                <h2>Intégrations <em>tierces</em></h2>
                <p>Services externes connectés à CHADIA Projects. Édition à venir via le menu de chaque carte.</p>
              </div>
            </div>

            <div className="integ">
              {[
                { tone: "bsic", icon: "ph-bank", nm: "BSIC Tchad", sub: bsic.active ? "Connecté" : "Non configuré", active: bsic.active, desc: "Compte bancaire principal — rapprochement automatique des décaissements." },
                { tone: "gmail", icon: "ph-envelope", nm: "Google Workspace", sub: gmail.active ? `${(gmail as { email?: string }).email ?? "Connecté"}` : "Non configuré", active: gmail.active, desc: "Envoi des invitations, notifications de marchés et accusés de réception." },
                { tone: "cal", icon: "ph-calendar-blank", nm: "Cal.com", sub: calcom.active ? "Connecté" : "Non configuré", active: calcom.active, desc: "Réservation de rendez-vous pour les fournisseurs et journalistes." },
                { tone: "amg", icon: "ph-cloud", nm: "Hetzner Storage Box", sub: hetzner.active ? "Synchro nocturne" : "Non configuré", active: hetzner.active, desc: "Sauvegarde chiffrée hors-site de la bibliothèque documentaire et de la base." },
                { tone: "off", icon: "ph-file-text", nm: "DocuSign", sub: docusign.active ? "Connecté" : "Non configuré", active: docusign.active, desc: "Signature électronique des conventions et notifications d'attribution." },
                { tone: "off", icon: "ph-chart-bar", nm: "Plausible Analytics", sub: plausible.active ? `${(plausible as { domain?: string }).domain ?? "Connecté"}` : "Non configuré", active: plausible.active, desc: "Analyse d'audience respectueuse de la vie privée (sans cookies)." },
              ].map((it) => (
                <div key={it.nm} className="icard">
                  <div className="top">
                    <div className={`ic ${it.tone}`}><i className={`ph-fill ${it.icon}`}></i></div>
                    <div className="nm">{it.nm}<small>{it.sub}</small></div>
                  </div>
                  <p className="desc">{it.desc}</p>
                  <div className="actions">
                    <span className={`status ${it.active ? "live" : "off"}`}>{it.active ? "● Actif" : "Désactivé"}</span>
                    <a href="#">{it.active ? "Configurer →" : "Activer →"}</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
