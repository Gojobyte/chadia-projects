import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const FOLDERS = [
  { icon: "ph-fill ph-folder", label: "Tous les fichiers", count: 186, on: true },
  { icon: "ph ph-star", label: "Épinglés", count: 8 },
  { icon: "ph ph-clock", label: "Récents", count: 12 },
];

const CATEGORIES = [
  { icon: "ph ph-scroll", label: "Modèles d'AO", count: 14 },
  { icon: "ph ph-file-text", label: "Statuts & juridique", count: 9 },
  { icon: "ph ph-folders", label: "Projets", count: 82 },
  { icon: "ph ph-handshake", label: "Conventions bailleurs", count: 23 },
  { icon: "ph ph-coins", label: "Comptabilité", count: 31 },
  { icon: "ph ph-camera", label: "Médias terrain", count: 27 },
];

const PINNED = [
  { type: "tpl", typeIcon: "ph-scroll", typeLabel: "Modèle", titre: "Dossier ", em: "type", apres: " de réponse · UE PRAG", desc: "Trame complète conforme au PRAG 2024 — note méthodologique, cadre logique, budget, déclarations probité & absence de conflit d'intérêts. Pré-rempli aux entêtes CHADIA.", meta: ["DOCX · 1,2 Mo", "v4.2 · 12 mars"], v: "14 utilisations" },
  { type: "pdf", typeIcon: "ph-file-pdf", typeLabel: "PDF", titre: "Manuel des ", em: "procédures", apres: " achats CHADIA", desc: "Seuils de mise en concurrence, composition du comité de dépouillement, archivage, gestion des conflits d'intérêts. Validé par le conseil le 14 février 2026.", meta: ["PDF · 3,8 Mo · 42 p.", "v2.1 · 14 fév."], v: "Référence" },
  { type: "xls", typeIcon: "ph-file-xls", typeLabel: "XLSX", titre: "Trame ", em: "budgétaire", apres: " projet · 3 ans", desc: "Modèle budget pluriannuel par lignes, avec calcul automatique des coûts indirects (7%) et conversion FCFA / EUR. Versions colonnes UE, PNUD, AFD intégrées.", meta: ["XLSX · 380 Ko", "v3.0 · 28 mars"], v: "9 utilisations" },
];

const RECENTS = [
  { icon: "pdf", iconLabel: "PDF", nm: "Rapport technique trimestriel · PRJ-2026-08", sub: "Inondations Batha · T1 2026", cat: "ph-folders Projets", visTone: "int", visLabel: "Interne", byTone: "ink", byInit: "MM", by: "Moussa M.", date: "il y a 2 h", size: "2,4 Mo" },
  { icon: "doc", iconLabel: "DOCX", nm: "Note conceptuelle · Scolarisation des filles", sub: "Concept paper Coop. Française", cat: "ph-handshake Conventions", visTone: "conf", visLabel: "Confidentiel", byTone: "terracotta", byInit: "AS", by: "Aïssatou S.", date: "hier · 17:40", size: "540 Ko" },
  { icon: "xls", iconLabel: "XLSX", nm: "Suivi décaissement avril 2026", sub: "Rapprochement banque BSIC", cat: "ph-coins Comptabilité", visTone: "conf", visLabel: "Confidentiel", byTone: "success", byInit: "NK", by: "Naïma K.", date: "il y a 1 j", size: "186 Ko" },
  { icon: "pdf", iconLabel: "PDF", nm: "CR comité de dépouillement AO-2026-091", sub: "Kits scolaires · 22 avril", cat: "ph-megaphone Marchés", visTone: "pub", visLabel: "Public", byTone: "info", byInit: "IB", by: "Issa B.", date: "il y a 3 j", size: "920 Ko" },
  { icon: "zip", iconLabel: "ZIP", nm: "Photos terrain · forage Bitkine", sub: "14 photos · attestation comité", cat: "ph-camera Médias", visTone: "int", visLabel: "Interne", byTone: "mineral", byInit: "DH", by: "Djimkoumda H.", date: "il y a 4 j", size: "38,2 Mo" },
  { icon: "ppt", iconLabel: "PPTX", nm: "Présentation bailleurs · trimestre 1", sub: "Slides comité de pilotage", cat: "ph-handshake Conventions", visTone: "int", visLabel: "Interne", byTone: "terracotta", byInit: "AS", by: "Aïssatou S.", date: "il y a 5 j", size: "4,1 Mo" },
  { icon: "pdf", iconLabel: "PDF", nm: "Récépissé n°187/MAT/SG/DAPSAJ", sub: "Reconnaissance ONG · scan officiel", cat: "ph-file-text Statuts", visTone: "pub", visLabel: "Public", byTone: "ink", byInit: "AS", by: "Aïssatou S.", date: "il y a 8 j", size: "1,1 Mo" },
  { icon: "doc", iconLabel: "DOCX", nm: "Termes de référence · diagnostic genre", sub: "AO-2026-088 · Bitkine", cat: "ph-megaphone Marchés", visTone: "pub", visLabel: "Public", byTone: "ink", byInit: "MM", by: "Moussa M.", date: "il y a 12 j", size: "320 Ko" },
];

const TEMPLATES = [
  { nm: "Dossier d'appel d'offres standard", sub: "DAO complet · biens & services", fmt: "DOCX + 4 annexes", uses: "28 utilisations", upd: "v3.1 · 02 mars", byTone: "info", byInit: "IB", by: "Issa B." },
  { nm: "Cadre logique projet (PNUD format)", sub: "Logframe + matrice indicateurs", fmt: "XLSX", uses: "11 utilisations", upd: "v2.0 · 18 fév.", byTone: "ink", byInit: "MM", by: "Moussa M." },
  { nm: "Convention de partenariat OSC", sub: "Pour ONG locales partenaires", fmt: "DOCX · 8 p.", uses: "6 utilisations", upd: "v1.4 · 22 jan.", byTone: "terracotta", byInit: "AS", by: "Aïssatou S." },
  { nm: "Ordre de mission terrain", sub: "Avec circuit de validation", fmt: "DOCX", uses: "42 utilisations", upd: "v2.2 · 15 jan.", byTone: "mineral", byInit: "MS", by: "Maïmouna S." },
];

export default async function BibliothequePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">186 documents · 12,4 Go · sauvegardés 2× / jour</div>
          <h1 className="pg-title">La <em>bibliothèque</em> documentaire.</h1>
          <p className="pg-sub">
            Statuts, modèles d&apos;appels d&apos;offres, rapports techniques, livrables bailleurs,
            archives administratives. Versionning automatique, contrôle d&apos;accès par dossier,
            et lien direct depuis chaque appel d&apos;offres ou projet.
          </p>
        </div>
        <div className="pg-actions">
          <button className="btn btn--ghost btn--sm"><i className="ph ph-folder-plus"></i> Nouveau dossier</button>
          <button className="btn btn--accent btn--sm"><i className="ph ph-upload"></i> Téléverser</button>
        </div>
      </header>

      <div className="bb-layout">
        <nav className="bb-tree">
          <h4>Dossiers</h4>
          {FOLDERS.map((f) => (
            <a key={f.label} className={f.on ? "on" : ""}>
              <i className={f.icon}></i> {f.label} <span className="ct">{f.count}</span>
            </a>
          ))}
          <div className="sep"></div>
          <h4>Par catégorie</h4>
          {CATEGORIES.map((c) => (
            <a key={c.label}>
              <i className={c.icon}></i> {c.label} <span className="ct">{c.count}</span>
            </a>
          ))}
          <div className="sep"></div>
          <h4>Stockage</h4>
          <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>12,4 Go</span><span>/ 50 Go</span>
            </div>
            <div style={{ height: 4, background: "var(--color-canvas)", borderRadius: 2, overflow: "hidden" }}>
              <span style={{ display: "block", width: "25%", height: "100%", background: "var(--color-terracotta)" }}></span>
            </div>
          </div>
        </nav>

        <div>
          <div className="bb-bar">
            <label className="search" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, height: 32, padding: "0 12px", background: "var(--color-page)", border: "1px solid var(--color-line-strong)", borderRadius: 4, maxWidth: 360, minWidth: 220 }}>
              <i className="ph ph-magnifying-glass" style={{ color: "var(--color-shale)" }}></i>
              <input type="text" placeholder="Rechercher dans 186 fichiers…" style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "400 13px var(--font-sans)" }} />
            </label>
            <button className="pill"><i className="ph ph-funnel"></i> Type <i className="ph ph-caret-down"></i></button>
            <button className="pill"><i className="ph ph-tag"></i> Étiquettes <i className="ph ph-caret-down"></i></button>
            <button className="pill"><i className="ph ph-eye"></i> Visibilité <i className="ph ph-caret-down"></i></button>
          </div>

          <div className="bb-sec-h">
            <h3><em>Épinglés</em> par l&apos;équipe</h3>
            <span className="ct">3 · vu 47× cette semaine</span>
          </div>

          <div className="pinned-grid">
            {PINNED.map((p) => (
              <article key={p.titre + p.em} className="pin-card">
                <div className="top">
                  <span className={`ftype ${p.type}`}><i className={`ph ${p.typeIcon}`}></i> {p.typeLabel}</span>
                  <i className="ph-fill ph-push-pin pin-i"></i>
                </div>
                <h4>{p.titre}<em>{p.em}</em>{p.apres}</h4>
                <p className="desc">{p.desc}</p>
                <div className="foot">
                  <span>{p.meta[0]}</span><span className="sep">·</span>
                  <span>{p.meta[1]}</span>
                  <span className="v">{p.v}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="bb-sec-h">
            <h3>Ajoutés <em>récemment</em></h3>
            <span className="ct">12 fichiers · 14 derniers jours</span>
          </div>

          <div className="files">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "38%" }}>Fichier</th>
                  <th>Catégorie</th>
                  <th>Visibilité</th>
                  <th>Téléversé par</th>
                  <th>Modifié</th>
                  <th>Taille</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {RECENTS.map((r) => {
                  const [iconClass, ...labelParts] = r.cat.split(" ");
                  const catLabel = labelParts.join(" ");
                  return (
                    <tr key={r.nm}>
                      <td>
                        <div className="file">
                          <span className={`icon ${r.icon}`}>{r.iconLabel}</span>
                          <div className="nm">{r.nm}<small>{r.sub}</small></div>
                        </div>
                      </td>
                      <td><span className="meta-tag"><i className={`ph ${iconClass}`}></i> {catLabel}</span></td>
                      <td><span className={`vis ${r.visTone}`}>{r.visLabel}</span></td>
                      <td>
                        <div className="by">
                          <span className={`avatar avatar--xs avatar--${r.byTone}`}>{r.byInit}</span> {r.by}
                        </div>
                      </td>
                      <td><span className="stamp">{r.date}</span></td>
                      <td><span className="stamp">{r.size}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <button style={{ background: "transparent", border: "none", color: "var(--color-stone)", cursor: "pointer", padding: 4, fontSize: 16 }}>
                          <i className="ph ph-dots-three"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bb-sec-h">
            <h3>Modèles <em>réutilisables</em></h3>
            <span className="ct">14 trames · entête CHADIA</span>
          </div>

          <div className="files">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "38%" }}>Modèle</th>
                  <th>Format</th>
                  <th>Utilisations</th>
                  <th>Dernière maj</th>
                  <th>Auteur</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATES.map((t) => (
                  <tr key={t.nm}>
                    <td>
                      <div className="file">
                        <span className="icon tpl">TRA</span>
                        <div className="nm">{t.nm}<small>{t.sub}</small></div>
                      </div>
                    </td>
                    <td><span className="stamp">{t.fmt}</span></td>
                    <td><span className="stamp">{t.uses}</span></td>
                    <td><span className="stamp">{t.upd}</span></td>
                    <td>
                      <div className="by">
                        <span className={`avatar avatar--xs avatar--${t.byTone}`}>{t.byInit}</span> {t.by}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button style={{ background: "transparent", border: "none", color: "var(--color-stone)", cursor: "pointer", padding: 4, fontSize: 16 }}>
                        <i className="ph ph-arrow-right"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
