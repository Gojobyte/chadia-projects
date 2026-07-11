import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DocumentUploader } from "@/components/DocumentUploader";
// Réutilise le wrapper client de la bibliothèque (modal preview + interception
// des clics sur les <a data-doc-id>). Le nom est spécifique mais le composant
// est générique — on l'utilise tel quel ici aussi.
import { BibliothequeClient } from "../bibliotheque/BibliothequeClient";

interface Document {
  id: string;
  nom: string;
  type: string;
  category: string;
  visibility: "PUBLIC" | "INTERNE" | "CONFIDENTIEL";
  mimeType?: string | null;
  taille?: number | null;
  url: string;
  version?: string | null;
  tags: string[];
  isPinned: boolean;
  description?: string | null;
  createdAt: string;
  uploadedBy?: string | null;
}

// Les 4 catégories thématiques affichées en haut.
// Chaque catégorie pointe vers un filtre côté bibliothèque pour creuser.
interface Cat {
  key: string;
  title: string;
  desc: string;
  icon: string;
  href: string;
  iconBg: string;
  iconColor: string;
  // matcher détermine quels documents (type+category+tags) appartiennent à cette section
  match: (d: Document) => boolean;
}

const CATEGORIES: Cat[] = [
  {
    key: "reponse-ao",
    title: "Réponse appel d'offres",
    desc: "Trames complètes par bailleur",
    icon: "ph-megaphone",
    href: "/bibliotheque?category=MODELES_AO",
    iconBg: "var(--color-terracotta-soft)",
    iconColor: "var(--color-terracotta)",
    match: (d) => d.category === "MODELES_AO" || /pra(g)?|trame/i.test(d.nom + " " + (d.description ?? "")),
  },
  {
    key: "cadre-logique",
    title: "Cadre logique",
    desc: "Logframes, théories du changement",
    icon: "ph-target",
    href: "/bibliotheque?category=PROJETS",
    iconBg: "var(--color-info-soft)",
    iconColor: "var(--color-info)",
    match: (d) => /logframe|cadre logique|théorie/i.test(d.nom + " " + (d.description ?? "")),
  },
  {
    key: "budget",
    title: "Budgets",
    desc: "Trames pluriannuelles, par poste",
    icon: "ph-coins",
    href: "/bibliotheque?category=COMPTABILITE",
    iconBg: "var(--color-success-soft)",
    iconColor: "var(--color-success)",
    match: (d) => d.type === "BUDGET" || /budget|trame finan/i.test(d.nom + " " + (d.description ?? "")),
  },
  {
    key: "contrats",
    title: "Contrats & conventions",
    desc: "OSC, prestataires, partenariats",
    icon: "ph-handshake",
    href: "/bibliotheque?category=CONVENTIONS_BAILLEURS",
    iconBg: "var(--color-canvas)",
    iconColor: "var(--color-shale)",
    match: (d) => d.category === "CONVENTIONS_BAILLEURS" || d.type === "CONTRAT",
  },
];

function ftypeForMime(mime: string | null | undefined): { kind: "pdf" | "doc" | "xls" | "ppt" | "txt"; label: string } {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("pdf")) return { kind: "pdf", label: "PDF" };
  if (m.includes("wordprocessingml") || m.includes("msword")) return { kind: "doc", label: "DOCX" };
  if (m.includes("spreadsheetml") || m.includes("excel")) return { kind: "xls", label: "XLSX" };
  if (m.includes("presentationml") || m.includes("powerpoint")) return { kind: "ppt", label: "PPTX" };
  return { kind: "txt", label: "FICHIER" };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  let templates: Document[] = [];
  let errorMsg: string | null = null;
  try {
    // Tous les documents marqués comme modèles (type TEMPLATE).
    // Si l'API ne supporte pas ce filtre, on récupère tout puis on filtre côté Node.
    const data = await TenderAPI.listDocuments({}, token);
    const all: Document[] = data.documents ?? [];
    templates = all.filter((d) => d.type === "TEMPLATE" || /\bmodèle|trame|template\b/i.test(d.nom));
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  // Comptage par catégorie
  const countByCategory: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    countByCategory[cat.key] = templates.filter(cat.match).length;
  }

  const mostUsed = templates.slice(0, 6);

  // Map id→doc minimal pour le wrapper client qui intercepte les clics et
  // ouvre le modal de preview au lieu de naviguer.
  const docsMap: Record<string, { id: string; nom: string; mimeType?: string | null; taille?: number | null; originalName?: string | null }> = {};
  for (const d of mostUsed) {
    docsMap[d.id] = { id: d.id, nom: d.nom, mimeType: d.mimeType, taille: d.taille };
  }

  return (
    <BibliothequeClient docsMap={docsMap}>
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            Bibliothèque · {templates.length} modèle{templates.length > 1 ? "s" : ""} · entête CHADIA
          </div>
          <h1 className="pg-title">
            Tem<em>plates</em>.
          </h1>
          <p className="pg-sub">
            Modèles de documents réutilisables : trames de réponse, contrats, grilles d&apos;évaluation et conventions.
            Chaque modèle se duplique automatiquement dans un dossier d&apos;appel d&apos;offres.
          </p>
        </div>
        <div className="pg-actions">
          <DocumentUploader
            defaultCategory="MODELES_AO"
            defaultType="TEMPLATE"
            buttonLabel="Importer un modèle"
            compact
          />
          <Link href="/bibliotheque?category=MODELES_AO" className="btn btn--accent btn--sm">
            <i className="ph ph-plus" aria-hidden="true"></i> Nouveau modèle
          </Link>
        </div>
      </header>

      {errorMsg ? (
        <div
          className="card"
          style={{
            padding: 16,
            marginTop: 16,
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            borderColor: "rgba(163,45,45,0.18)",
          }}
        >
          Service tender : {errorMsg}
        </div>
      ) : null}

      {/* === 4 catégories thématiques === */}
      <div className="tpl-cat">
        {CATEGORIES.map((cat) => (
          <Link key={cat.key} href={cat.href} className="c">
            <div className="ic" style={{ background: cat.iconBg, color: cat.iconColor }}>
              <i className={`ph ${cat.icon}`} aria-hidden="true"></i>
            </div>
            <h5>{cat.title}</h5>
            <p>{cat.desc}</p>
            <div className="ct">{countByCategory[cat.key] ?? 0} modèle{(countByCategory[cat.key] ?? 0) > 1 ? "s" : ""}</div>
          </Link>
        ))}
      </div>

      <div className="priv-sec-h">
        <h3>
          Modèles <em>les plus utilisés</em>
        </h3>
        <span className="meta">Période · 6 derniers mois</span>
      </div>

      {mostUsed.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          <div className="ic">
            <i className="ph ph-scroll" aria-hidden="true"></i>
          </div>
          <h3 className="t">
            Aucun <em>modèle</em> pour l&apos;instant
          </h3>
          <p className="s">
            Téléversez votre première trame (note méthodologique PRAG, budget pluriannuel, convention OSC…).
            Elle sera dupliquée automatiquement dans chaque nouveau dossier de candidature.
          </p>
          <DocumentUploader defaultCategory="MODELES_AO" defaultType="TEMPLATE" buttonLabel="Téléverser un modèle" />
        </div>
      ) : (
        <div className="bb-grid">
          {mostUsed.map((d) => {
            const ft = ftypeForMime(d.mimeType);
            const isValidated = d.visibility !== "CONFIDENTIEL";
            return (
              <a
                key={d.id}
                href={`/api/documents/${d.id}/file`}
                data-doc-id={d.id}
                target="_blank"
                rel="noreferrer"
                className="tpl-card"
              >
                <div className="top">
                  <span className={`ftype ${ft.kind}`}>{ft.label}</span>
                  <span className={`badge ${isValidated ? "badge--published" : "badge--review"}`}>
                    <span className="dot"></span>
                    {isValidated ? "Validé" : "Brouillon"}
                  </span>
                </div>
                <h4>{d.nom}</h4>
                <p className="sub">
                  {d.description
                    ? d.description
                    : "Modèle réutilisable disponible dans chaque nouveau dossier."}
                </p>
                <div className="foot">
                  <span>
                    {d.version ? `v${d.version} · ` : ""}
                    {fmtDate(d.createdAt)}
                    {d.uploadedBy ? ` · ${d.uploadedBy}` : ""}
                  </span>
                  <span style={{ color: "var(--color-terracotta)" }}>{d.tags.length || 0} × utilisé</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
    </BibliothequeClient>
  );
}
