import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DocumentUploader } from "@/components/DocumentUploader";
import { BibliothequeClient } from "./BibliothequeClient";

interface Document {
  id: string;
  nom: string;
  originalName?: string | null;
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

const CATEGORIES = [
  { v: "MODELES_AO", label: "Modèles de réponse", icon: "ph-scroll" },
  { v: "STATUTS_JURIDIQUE", label: "Statuts & juridique", icon: "ph-file-text" },
  { v: "PROJETS", label: "Projets", icon: "ph-folders" },
  { v: "CONVENTIONS_BAILLEURS", label: "Conventions bailleurs", icon: "ph-handshake" },
  { v: "COMPTABILITE", label: "Comptabilité", icon: "ph-coins" },
  { v: "MEDIAS_TERRAIN", label: "Médias terrain", icon: "ph-camera" },
  { v: "RAPPORTS", label: "Rapports", icon: "ph-file-pdf" },
  { v: "AUTRE", label: "Autre", icon: "ph-folder" },
];

const VISIBILITY_LABEL: Record<Document["visibility"], string> = {
  PUBLIC: "Public",
  INTERNE: "Interne",
  CONFIDENTIEL: "Confidentiel",
};

const VISIBILITY_TONE: Record<Document["visibility"], { color: string; bg: string; bd: string }> = {
  PUBLIC: { color: "var(--color-info)", bg: "var(--color-info-soft)", bd: "rgba(44,93,111,0.24)" },
  INTERNE: { color: "var(--color-success)", bg: "var(--color-success-soft)", bd: "rgba(91,138,58,0.24)" },
  CONFIDENTIEL: { color: "var(--color-danger)", bg: "var(--color-danger-soft)", bd: "rgba(163,45,45,0.24)" },
};

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

function totalSize(docs: Document[]): string {
  const bytes = docs.reduce((s, d) => s + (d.taille ?? 0), 0);
  return formatSize(bytes);
}

function fmtRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = (now - t) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** URL pour ouvrir/visualiser un document en 1 clic.
 *  Route dédiée `/api/documents/:id/file` qui valide la session et forward
 *  au tender service avec préservation des headers `Content-Type` et
 *  `Content-Disposition: inline` → PDF s'ouvre dans le viewer natif.
 *  (On n'utilise pas le proxy catch-all `/api/[...service]` qui ne gère pas
 *   correctement le routage multi-segments.) */
function viewUrl(docId: string): string {
  return `/api/documents/${docId}/file`;
}

function ftypeForMime(mime: string | null | undefined, type: string): { kind: "pdf" | "doc" | "xls" | "ppt" | "zip" | "img" | "txt"; label: string; icon: string } {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("pdf")) return { kind: "pdf", label: "PDF", icon: "ph-file-pdf" };
  if (m.includes("wordprocessingml") || m.includes("msword") || /\bdocx?\b/.test(m)) return { kind: "doc", label: "DOCX", icon: "ph-file-doc" };
  if (m.includes("spreadsheetml") || m.includes("excel") || /\bxlsx?\b/.test(m)) return { kind: "xls", label: "XLSX", icon: "ph-file-xls" };
  if (m.includes("presentationml") || m.includes("powerpoint") || /\bpptx?\b/.test(m)) return { kind: "ppt", label: "PPTX", icon: "ph-presentation" };
  if (m.startsWith("image/")) return { kind: "img", label: "IMG", icon: "ph-image" };
  if (m.includes("zip") || m.includes("compressed")) return { kind: "zip", label: "ZIP", icon: "ph-file-zip" };
  if (m.startsWith("text/")) return { kind: "txt", label: "TXT", icon: "ph-file-text" };
  // Fallback selon le type métier
  if (type === "TEMPLATE") return { kind: "doc", label: "Modèle", icon: "ph-scroll" };
  return { kind: "txt", label: "FICHIER", icon: "ph-file" };
}

export default async function BibliothequePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; pinned?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const { category, q, pinned } = await searchParams;
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (q) params.q = q;
  if (pinned === "true") params.isPinned = "true";

  let documents: Document[] = [];
  let total = 0;
  let errorMsg: string | null = null;
  // Pour les compteurs de la sidebar : on récupère TOUS les documents sans
  // filtre en parallèle. Sinon, cliquer sur une catégorie ferait tomber à 0
  // les compteurs des autres (API renvoie la liste filtrée).
  let allDocsForCount: Document[] = [];
  let allTotal = 0;
  try {
    const [filteredData, allData] = await Promise.all([
      TenderAPI.listDocuments(params, token),
      // 2ème appel : sans filtre. Si on n'a aucun filtre actif (page par
      // défaut), on évite l'appel doublon en réutilisant le résultat ci-haut.
      Object.keys(params).length === 0
        ? Promise.resolve(null)
        : TenderAPI.listDocuments({}, token),
    ]);
    documents = filteredData.documents ?? [];
    total = filteredData.total ?? documents.length;
    if (allData) {
      allDocsForCount = allData.documents ?? [];
      allTotal = allData.total ?? allDocsForCount.length;
    } else {
      allDocsForCount = documents;
      allTotal = total;
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  // Compteurs globaux (toujours basés sur la liste complète, pas filtrée).
  const countByCategory = CATEGORIES.reduce((acc, c) => {
    acc[c.v] = allDocsForCount.filter((d) => d.category === c.v).length;
    return acc;
  }, {} as Record<string, number>);
  const totalPinnedAll = allDocsForCount.filter((d) => d.isPinned).length;

  const pinnedDocs = documents.filter((d) => d.isPinned);
  const recents = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  // Tableau de stockage indicatif — la valeur 50 Go correspond au plafond actuel
  // du volume Docker monté pour les uploads. À ajuster si on change l'allocation.
  const STORAGE_CAP_BYTES = 50 * 1024 * 1024 * 1024;
  const usedBytes = documents.reduce((s, d) => s + (d.taille ?? 0), 0);
  const storagePct = Math.max(1, Math.min(100, Math.round((usedBytes / STORAGE_CAP_BYTES) * 100)));

  const isFiltering = !!(category || q || pinned === "true");

  // Map id→doc minimal pour que le wrapper client puisse résoudre quand on
  // clique sur n'importe quel `[data-doc-id]` dans la page.
  const docsMap: Record<string, { id: string; nom: string; mimeType?: string | null; taille?: number | null; originalName?: string | null }> = {};
  for (const d of documents) {
    docsMap[d.id] = { id: d.id, nom: d.nom, mimeType: d.mimeType, taille: d.taille, originalName: d.originalName };
  }

  return (
    <BibliothequeClient docsMap={docsMap}>
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            {total} document{total > 1 ? "s" : ""} · {totalSize(documents)} · stockage local
          </div>
          <h1 className="pg-title">
            La <em>bibliothèque</em> documentaire.
          </h1>
          <p className="pg-sub">
            Statuts, modèles de réponse, rapports techniques, livrables bailleurs. Chaque pièce versionnée se
            branche automatiquement sur les nouveaux dossiers d&apos;appel d&apos;offres.
          </p>
        </div>
        <div className="pg-actions">
          <button type="button" className="btn btn--ghost btn--sm" disabled aria-disabled="true">
            <i className="ph ph-folder-plus" aria-hidden="true"></i> Nouveau dossier
          </button>
          <button type="button" className="btn btn--secondary btn--sm" disabled aria-disabled="true">
            <i className="ph ph-link-simple" aria-hidden="true"></i> Lier depuis Drive
          </button>
          <DocumentUploader defaultCategory={category ?? "AUTRE"} defaultType="AUTRE" buttonLabel="Téléverser" />
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

      <div className="bb-shell">
        {/* GAUCHE — arbre dossiers */}
        <nav className="bb-tree" aria-label="Dossiers">
          <h4>Dossiers</h4>
          <Link href="/bibliotheque" className={!category && !pinned ? "on" : ""}>
            <i className="ph-fill ph-folder" aria-hidden="true"></i> Tous les fichiers <span className="ct">{allTotal}</span>
          </Link>
          <Link href="/bibliotheque?pinned=true" className={pinned === "true" ? "on" : ""}>
            <i className="ph ph-star" aria-hidden="true"></i> Épinglés <span className="ct">{totalPinnedAll}</span>
          </Link>
          <div className="sep"></div>
          <h4>Par catégorie</h4>
          {CATEGORIES.map((c) => (
            <Link key={c.v} href={`/bibliotheque?category=${c.v}`} className={category === c.v ? "on" : ""}>
              <i className={`ph ${c.icon}`} aria-hidden="true"></i> {c.label} <span className="ct">{countByCategory[c.v] ?? 0}</span>
            </Link>
          ))}
          <div className="sep"></div>
          <h4>Stockage</h4>
          <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>{totalSize(documents)}</span>
              <span>/ 50 Go</span>
            </div>
            <div className="bar">
              <span style={{ width: `${storagePct}%` }}></span>
            </div>
          </div>
        </nav>

        {/* DROITE — barre + grilles */}
        <div>
          <form method="get" className="bb-bar">
            {category ? <input type="hidden" name="category" value={category} /> : null}
            {pinned ? <input type="hidden" name="pinned" value={pinned} /> : null}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 32,
                padding: "0 12px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-line-strong)",
                borderRadius: 6,
                flex: 1,
                minWidth: 220,
                maxWidth: 400,
              }}
            >
              <i className="ph ph-magnifying-glass" style={{ color: "var(--color-stone)" }} aria-hidden="true"></i>
              <input
                name="q"
                type="text"
                defaultValue={q ?? ""}
                placeholder={`Rechercher dans ${total} fichier${total > 1 ? "s" : ""}…`}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  font: "400 13px var(--font-sans)",
                }}
              />
            </label>
            <button type="submit" className="pill" style={{ background: "var(--color-ink)", color: "var(--color-page)", borderColor: "var(--color-ink)" }}>
              Rechercher
            </button>
            <span style={{ flex: 1 }}></span>
            <button type="button" className="pill" disabled aria-disabled="true">
              <i className="ph ph-funnel" aria-hidden="true"></i> Type <i className="ph ph-caret-down" aria-hidden="true"></i>
            </button>
            <button type="button" className="pill" disabled aria-disabled="true">
              <i className="ph ph-tag" aria-hidden="true"></i> Étiquettes <i className="ph ph-caret-down" aria-hidden="true"></i>
            </button>
            <button type="button" className="pill on" aria-pressed="true" title="Vue grille">
              <i className="ph ph-squares-four" aria-hidden="true"></i>
            </button>
          </form>

          {documents.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}>
              <div className="ic">
                <i className="ph ph-files" aria-hidden="true"></i>
              </div>
              <h3 className="t">
                Bibliothèque <em>vide</em>
              </h3>
              <p className="s">
                {q || category ? "Aucun document ne correspond à ces filtres." : "Téléversez votre premier document pour démarrer."}
              </p>
              <DocumentUploader buttonLabel="Téléverser le premier document" />
            </div>
          ) : (
            <>
              {/* === Épinglés (uniquement en vue par défaut) === */}
              {!isFiltering && pinnedDocs.length > 0 ? (
                <>
                  <div className="priv-sec-h">
                    <h3>
                      <em>Épinglés</em> par l&apos;équipe
                    </h3>
                    <span className="meta">
                      {pinnedDocs.length} document{pinnedDocs.length > 1 ? "s" : ""} · accès rapide
                    </span>
                  </div>
                  <div className="bb-grid">
                    {pinnedDocs.slice(0, 6).map((d) => {
                      const ft = ftypeForMime(d.mimeType, d.type);
                      return (
                        <a key={d.id} href={viewUrl(d.id)} data-doc-id={d.id} target="_blank" rel="noreferrer" className="tpl-card">
                          <div className="top">
                            <span className={`ftype ${ft.kind}`}>
                              <i className={`ph ${ft.icon}`} aria-hidden="true"></i> {ft.label}
                            </span>
                            <i className="ph-fill ph-push-pin" style={{ color: "var(--color-terracotta)" }} aria-hidden="true"></i>
                          </div>
                          <h4>{d.nom}</h4>
                          {d.description ? <p className="sub">{d.description}</p> : <p className="sub">{CATEGORIES.find((c) => c.v === d.category)?.label ?? "Document"}</p>}
                          <div className="foot">
                            <span>
                              {ft.label} · {formatSize(d.taille)}
                              {d.version ? ` · v${d.version}` : ""}
                            </span>
                            <span>{fmtRelative(d.createdAt)}</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {/* === Récents (vue par défaut) ou résultats filtrés === */}
              <div className="priv-sec-h" style={{ marginTop: isFiltering ? 0 : 24 }}>
                <h3>
                  {isFiltering ? (
                    <>
                      {pinned ? <em>Épinglés</em> : null}
                      {category ? <em>{CATEGORIES.find((c) => c.v === category)?.label ?? category}</em> : null}
                      {q ? <>Résultats pour <em>«&nbsp;{q}&nbsp;»</em></> : null}
                    </>
                  ) : (
                    <>
                      Ajoutés <em>récemment</em>
                    </>
                  )}
                </h3>
                <span className="meta">
                  {(isFiltering ? documents.length : recents.length)} fichier
                  {(isFiltering ? documents.length : recents.length) > 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ background: "var(--color-surface-2)" }}>
                    <tr style={{ textAlign: "left" }}>
                      <th style={th}>Fichier</th>
                      <th style={th}>Catégorie</th>
                      <th style={th}>Visibilité</th>
                      <th style={th}>Téléversé</th>
                      <th style={{ ...th, textAlign: "right" }}>Taille</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isFiltering ? documents : recents).map((d) => {
                      const ft = ftypeForMime(d.mimeType, d.type);
                      const cat = CATEGORIES.find((c) => c.v === d.category);
                      const vis = VISIBILITY_TONE[d.visibility];
                      return (
                        <tr key={d.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span className={`ftype ${ft.kind}`}>
                                <i className={`ph ${ft.icon}`} aria-hidden="true"></i> {ft.label}
                              </span>
                              <div>
                                <a href={viewUrl(d.id)} data-doc-id={d.id} target="_blank" rel="noreferrer" style={{ color: "var(--color-ink)", fontWeight: 500 }}>
                                  {d.nom}
                                </a>
                                {d.description ? <div style={{ fontSize: 11, color: "var(--color-stone)" }}>{d.description}</div> : null}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: 12 }}>
                            <span className="tag">
                              {cat ? <><i className={`ph ${cat.icon}`} aria-hidden="true"></i> {cat.label}</> : d.category}
                            </span>
                          </td>
                          <td style={{ padding: 12 }}>
                            <span
                              className="tag"
                              style={{ color: vis.color, background: vis.bg, borderColor: vis.bd }}
                            >
                              {VISIBILITY_LABEL[d.visibility]}
                            </span>
                          </td>
                          <td style={{ padding: 12, color: "var(--color-stone)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                            {fmtRelative(d.createdAt)}
                          </td>
                          <td style={{ padding: 12, textAlign: "right", color: "var(--color-stone)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                            {formatSize(d.taille)}
                          </td>
                          <td style={{ padding: 12, textAlign: "right" }}>
                            <a
                              href={viewUrl(d.id)}
                              data-doc-id={d.id}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn--ghost btn--sm"
                              style={{ height: 24, padding: "0 8px" }}
                              title="Aperçu rapide"
                            >
                              <i className="ph ph-eye" aria-hidden="true"></i>
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </BibliothequeClient>
  );
}

const th: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-stone)",
  fontWeight: 500,
};
