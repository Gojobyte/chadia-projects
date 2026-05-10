import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const NAV = [
  { section: "Organisation", items: [
    { href: "#identite", icon: "ph-buildings", label: "Identité", on: true },
    { href: "#branding", icon: "ph-palette", label: "Branding" },
    { href: "#contacts", icon: "ph-address-book", label: "Contacts" },
  ]},
  { section: "Sécurité", items: [
    { href: "#sso", icon: "ph-key", label: "Connexion & SSO" },
    { href: "#audit", icon: "ph-clock-counter-clockwise", label: "Journal d'audit" },
    { href: "#data", icon: "ph-shield-check", label: "Données & sauvegardes" },
  ]},
  { section: "Cycle des marchés", items: [
    { href: "#cycle", icon: "ph-megaphone", label: "Workflow AO" },
    { href: "#numerot", icon: "ph-hash", label: "Numérotation" },
  ]},
  { section: "Intégrations", items: [
    { href: "#integ", icon: "ph-plug", label: "Services tiers" },
    { href: "#api", icon: "ph-code", label: "Clés API" },
  ]},
];

const TOGGLES = [
  { titre: "Publication automatique sur le registre public", desc: "Les appels d'offres validés sont publiés sur la page publique /marches dans l'heure qui suit. L'historique reste accessible 5 ans après clôture.", on: true },
  { titre: "Notification par email aux fournisseurs ciblés", desc: "Envoie automatiquement l'avis aux fournisseurs catégorisés par lot (eau, BTP, fournitures…). Configurable par AO.", on: true },
  { titre: "Verrouillage des plis avant ouverture", desc: "Les soumissions reçues restent chiffrées jusqu'à la séance d'ouverture officielle. Aucun membre — y compris les administrateurs — ne peut consulter le contenu avant cette date.", on: true },
  { titre: "Double validation avant attribution", desc: "Toute attribution requiert la signature électronique de la coordinatrice nationale et du président du comité de dépouillement.", on: true },
  { titre: "Génération automatique du PV de séance", desc: "Pré-remplit le procès-verbal du comité de dépouillement à partir des montants saisis. Beta — à valider manuellement avant signature.", on: false },
];

const INTEG = [
  { tone: "bsic", icon: "ph-bank", nm: "BSIC Tchad — compte principal", sub: "SWIFT BSIYTDND · IBAN ****-4128", desc: "Rapprochement automatique des décaissements projets avec les écritures bancaires. Récupère les relevés en CSV chaque nuit.", status: "live", statusLabel: "● Synchro 23:00", actionLabel: "Configurer →" },
  { tone: "gmail", icon: "ph-envelope", nm: "Google Workspace", sub: "chadiaong@gmail.com · 14 boîtes", desc: "Envoi des invitations, notifications de marchés et accusés de réception via Gmail. Synchronisation calendrier des séances de dépouillement.", status: "live", statusLabel: "● Connecté", actionLabel: "Configurer →" },
  { tone: "cal", icon: "ph-calendar-blank", nm: "Cal.com — réservations", sub: "cal.com/chadia-ong", desc: "Permet aux fournisseurs et journalistes de réserver des rendez-vous avec la coordination via le site public.", status: "live", statusLabel: "● Connecté", actionLabel: "Configurer →" },
  { tone: "amg", icon: "ph-cloud", nm: "Sauvegarde Hetzner Storage Box", sub: "BX21 · Falkenstein", desc: "Sauvegarde chiffrée hors-site (AES-256) de la bibliothèque documentaire et de la base. Rétention 90 jours.", status: "live", statusLabel: "● 12,4 / 50 Go", actionLabel: "Configurer →" },
  { tone: "off", icon: "ph-file-text", nm: "DocuSign · signature électronique", sub: "Non configuré", desc: "Faire signer électroniquement les conventions partenaires et notifications d'attribution. Plan associatif gratuit jusqu'à 50 envois/mois.", status: "off", statusLabel: "Désactivé", actionLabel: "Activer →" },
  { tone: "off", icon: "ph-chart-bar", nm: "Plausible Analytics", sub: "Non configuré", desc: "Mesure d'audience respectueuse de la vie privée pour le site public CHADIA. Sans cookies, conforme au cadre RGPD.", status: "off", statusLabel: "Désactivé", actionLabel: "Activer →" },
];

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Profil ONG · sécurité · intégrations</div>
          <h1 className="pg-title">Para<em>mètres.</em></h1>
          <p className="pg-sub">
            Identité juridique de l&apos;ONG, branding, comptes utilisateurs, intégrations bancaires
            et services tiers. Les modifications sont journalisées dans l&apos;audit log et visibles
            par les administrateurs.
          </p>
        </div>
        <div className="pg-actions">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
            Dernière modification · 18 mars 2026 · A. Saleh
          </span>
        </div>
      </header>

      <div className="pr-layout">
        <nav className="pr-tree">
          {NAV.map((g) => (
            <div key={g.section}>
              <h4>{g.section}</h4>
              {g.items.map((it) => (
                <a key={it.href} href={it.href} className={it.on ? "on" : ""}>
                  <i className={`ph ${it.icon}`}></i> {it.label}
                </a>
              ))}
              <div className="sep"></div>
            </div>
          ))}
          <a href="#danger" style={{ color: "var(--color-danger)" }}>
            <i className="ph ph-warning"></i> Zone sensible
          </a>
        </nav>

        <div>
          <section className="sec" id="identite">
            <div className="sec-head">
              <div>
                <h2>Identité <em>juridique</em></h2>
                <p>Informations officielles déclarées au ministère de l&apos;Administration du territoire</p>
              </div>
            </div>

            <div className="group-card">
              <div className="field-grid">
                <div className="field">
                  <label>Dénomination officielle <span className="req">*</span></label>
                  <input type="text" defaultValue="CHADIA — ONG pour le développement du Tchad" />
                </div>
                <div className="field">
                  <label>Forme juridique</label>
                  <input type="text" defaultValue="Association reconnue d'utilité publique" />
                </div>
                <div className="field">
                  <label>N° de récépissé <small>Délivré par le MATSPRD</small></label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="text" defaultValue="187/MAT/SG/DAPSAJ" disabled style={{ flex: 1 }} />
                    <span className="verified"><i className="ph-fill ph-seal-check"></i> Vérifié</span>
                  </div>
                </div>
                <div className="field">
                  <label>Date de fondation</label>
                  <input type="text" defaultValue="14 septembre 2018" />
                </div>
                <div className="field">
                  <label>NIF (numéro fiscal)</label>
                  <input type="text" defaultValue="2018-CHA-0142-N" />
                </div>
                <div className="field">
                  <label>Domaine d&apos;intervention</label>
                  <select defaultValue="multi">
                    <option value="multi">Développement intégré · multi-sectoriel</option>
                    <option>Santé</option>
                    <option>Éducation</option>
                  </select>
                </div>
                <div className="field full">
                  <label>Mission statutaire <small>Telle que déposée dans les statuts</small></label>
                  <textarea defaultValue="Contribuer au développement humain, social et économique du Tchad par des programmes de formation professionnelle, d'autonomisation des femmes, d'accès à l'eau, à la santé primaire et à l'éducation, dans une approche participative avec les communautés bénéficiaires des régions de N'Djaména, du Guéra et du Batha." />
                </div>
              </div>
            </div>
          </section>

          <section className="sec" id="branding">
            <div className="sec-head">
              <div><h2>Branding <em>&amp; signature</em></h2><p>Logo, couleurs et mention apparaissant sur les documents émis</p></div>
            </div>

            <div className="group-card">
              <div className="branding">
                <div className="logo-up">
                  <div className="mark">C</div>
                  <button className="change">Changer le logo</button>
                </div>
                <div className="field-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="field">
                    <label>Sigle court <small>Affiché en sidebar</small></label>
                    <input type="text" defaultValue="CHADIA" />
                  </div>
                  <div className="field">
                    <label>Couleur d&apos;accent</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ width: 36, height: 36, borderRadius: 4, background: "var(--color-terracotta)", border: "1px solid var(--color-line-strong)" }}></span>
                      <input type="text" defaultValue="#B85C3A · Terre cuite" />
                    </div>
                  </div>
                  <div className="field full">
                    <label>Mention de bas de page <small>Apparait sur les documents PDF générés</small></label>
                    <input type="text" defaultValue="ONG CHADIA · Récépissé 187/MAT/SG/DAPSAJ · BP 1142, N'Djaména · chadiaong@gmail.com" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="sec" id="cycle">
            <div className="sec-head">
              <div><h2>Workflow <em>des marchés</em></h2><p>Règles automatiques appliquées à chaque appel d&apos;offres</p></div>
            </div>

            <div className="group-card">
              {TOGGLES.map((t) => (
                <div key={t.titre} className="row-tog">
                  <div className="body">
                    <strong>{t.titre}</strong>
                    <p>{t.desc}</p>
                  </div>
                  <span className={`switch ${t.on ? "on" : ""}`}></span>
                </div>
              ))}
            </div>

            <div id="numerot" className="group-card">
              <div className="field-grid">
                <div className="field">
                  <label>Format référence AO</label>
                  <input type="text" defaultValue="AO-{ANNEE}-{NUM:3}" />
                  <span className="help">Prochaine référence : <strong style={{ color: "var(--color-terracotta)" }}>AO-2026-095</strong></span>
                </div>
                <div className="field">
                  <label>Format référence Soumission</label>
                  <input type="text" defaultValue="SOUM-{NUM_AO}-{NUM:2}" />
                  <span className="help">Suit la numérotation de l&apos;AO parent</span>
                </div>
                <div className="field">
                  <label>Format référence Projet</label>
                  <input type="text" defaultValue="PRJ-{ANNEE}-{NUM:2}" />
                  <span className="help">Prochaine référence : <strong style={{ color: "var(--color-terracotta)" }}>PRJ-2026-16</strong></span>
                </div>
                <div className="field">
                  <label>Année comptable</label>
                  <select defaultValue="cal">
                    <option value="cal">1 janvier — 31 décembre</option>
                    <option>1 juillet — 30 juin</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="sec" id="integ">
            <div className="sec-head">
              <div><h2>Intégrations <em>tierces</em></h2><p>Services externes connectés à CHADIA Projects</p></div>
              <button className="btn btn--ghost btn--sm"><i className="ph ph-plus"></i> Ajouter</button>
            </div>

            <div className="integ">
              {INTEG.map((it) => (
                <div key={it.nm} className="icard">
                  <div className="top">
                    <div className={`ic ${it.tone}`}><i className={`ph-fill ${it.icon}`}></i></div>
                    <div className="nm">{it.nm}<small>{it.sub}</small></div>
                  </div>
                  <p className="desc">{it.desc}</p>
                  <div className="actions">
                    <span className={`status ${it.status}`}>{it.statusLabel}</span>
                    <a href="#">{it.actionLabel}</a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="sec" id="danger">
            <div className="sec-head">
              <div><h2 style={{ color: "var(--color-danger)" }}>Zone <em>sensible</em></h2><p>Actions irréversibles · réservées à la coordinatrice</p></div>
            </div>

            <div className="group-card danger-zone">
              <div className="row-tog" style={{ borderColor: "rgba(163,45,45,0.2)" }}>
                <div className="body">
                  <strong>Exporter toutes les données ONG</strong>
                  <p>Archive ZIP complète : projets, AO, soumissions, fournisseurs, documents, équipe, journal d&apos;audit. Format JSON + binaires.</p>
                </div>
                <button className="btn btn--secondary btn--sm"><i className="ph ph-export"></i> Générer l&apos;archive</button>
              </div>
              <div className="row-tog" style={{ borderColor: "rgba(163,45,45,0.2)" }}>
                <div className="body">
                  <strong>Transférer la propriété de l&apos;espace</strong>
                  <p>Désigne un autre administrateur comme propriétaire. Vous conservez votre accès complet en tant qu&apos;administrateur.</p>
                </div>
                <button className="btn btn--secondary btn--sm">Transférer…</button>
              </div>
              <div className="row-tog" style={{ borderColor: "rgba(163,45,45,0.2)" }}>
                <div className="body">
                  <strong>Supprimer l&apos;espace de travail</strong>
                  <p>Détruit définitivement l&apos;espace CHADIA et toutes ses données après 30 jours de période de grâce. <em>Action soumise au vote du conseil d&apos;administration.</em></p>
                </div>
                <button className="btn btn--danger btn--sm"><i className="ph ph-trash"></i> Demander la suppression</button>
              </div>
            </div>
          </section>

          <div className="save-bar">
            <div className="info">Modifications non enregistrées · <strong>3 champs édités</strong></div>
            <button className="ghost">Annuler</button>
            <button className="primary">Enregistrer les modifications</button>
          </div>
        </div>
      </div>
    </div>
  );
}
