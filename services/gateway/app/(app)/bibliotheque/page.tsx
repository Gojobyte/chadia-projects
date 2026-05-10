import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";

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
  { v: "MODELES_AO", label: "Modèles d'AO", icon: "ph-scroll" },
  { v: "STATUTS_JURIDIQUE", label: "Statuts & juridique", icon: "ph-file-text" },
  { v: "PROJETS", label: "Projets", icon: "ph-folders" },
  { v: "CONVENTIONS_BAILLEURS", label: "Conventions bailleurs", icon: "ph-handshake" },
  { v: "COMPTABILITE", label: "Comptabilité", icon: "ph-coins" },
  { v: "MEDIAS_TERRAIN", label: "Médias terrain", icon: "ph-camera" },
  { v: "RAPPORTS", label: "Rapports", icon: "ph-file-pdf" },
  { v: "AUTRE", label: "Autre", icon: "ph-folder" },
];

function totalSize(docs: Document[]): string {
  const bytes = docs.reduce((s, d) => s + (d.taille ?? 0), 0);
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
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
  try {
    const data = await TenderAPI.listDocuments(params, token);
    documents = data.documents ?? [];
    total = data.total ?? documents.length;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  // Compteurs par catégorie (sur la liste totale, sans filtre actif)
  const countByCategory = CATEGORIES.reduce((acc, c) => {
    acc[c.v] = documents.filter((d) => d.category === c.v).length;
    return acc;
  }, {} as Record<string, number>);

  const pinned_docs = documents.filter((d) => d.isPinned);
  const recents = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const templates = documents.filter((d) => d.type === "TEMPLATE");

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            {total} document{total > 1 ? "s" : ""} · {totalSize(documents)} · stockage local
          </div>
          <h1 className="pg-title">La <em>bibliothèque</em> documentaire.</h1>
          <p className="pg-sub">
            Statuts, modèles d&apos;appels d&apos;offres, rapports techniques, livrables bailleurs. Versionning automatique et contrôle d&apos;accès par visibilité (public / interne / confidentiel).
          </p>
        </div>
        <div className="pg-actions">
          <DocumentUploader
            defaultCategory={category ?? "AUTRE"}
            defaultType="AUTRE"
            buttonLabel="Téléverser"
          />
        </div>
      </header>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service tender : {errorMsg}
        </div>
      )}

      <div className="bb-layout">
        <nav className="bb-tree">
          <h4>Dossiers</h4>
          <Link href="/bibliotheque" className={!category && !pinned ? "on" : ""}>
            <i className="ph-fill ph-folder"></i> Tous les fichiers <span className="ct">{total}</span>
          </Link>
          <Link href="/bibliotheque?pinned=true" className={pinned === "true" ? "on" : ""}>
            <i className="ph ph-star"></i> Épinglés <span className="ct">{pinned_docs.length}</span>
          </Link>
          <div className="sep"></div>
          <h4>Par catégorie</h4>
          {CATEGORIES.map((c) => (
            <Link
              key={c.v}
              href={`/bibliotheque?category=${c.v}`}
              className={category === c.v ? "on" : ""}
            >
              <i className={`ph ${c.icon}`}></i> {c.label} <span className="ct">{countByCategory[c.v] ?? 0}</span>
            </Link>
          ))}
          <div className="sep"></div>
          <h4>Stockage</h4>
          <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span>{totalSize(documents)}</span><span>volume local</span>
            </div>
            <div style={{ height: 4, background: "var(--color-canvas)", borderRadius: 2, overflow: "hidden" }}>
              <span style={{ display: "block", width: "8%", height: "100%", background: "var(--color-terracotta)" }}></span>
            </div>
          </div>
        </nav>

        <div>
          <form method="get" className="bb-bar">
            {category && <input type="hidden" name="category" value={category} />}
            {pinned && <input type="hidden" name="pinned" value={pinned} />}
            <label className="search" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, height: 32, padding: "0 12px", background: "var(--color-page)", border: "1px solid var(--color-line-strong)", borderRadius: 4, maxWidth: 360, minWidth: 220 }}>
              <i className="ph ph-magnifying-glass" style={{ color: "var(--color-shale)" }}></i>
              <input
                name="q"
                type="text"
                defaultValue={q ?? ""}
                placeholder="Rechercher dans la bibliothèque…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "400 13px var(--font-sans)" }}
              />
            </label>
            <button type="submit" className="pill" style={{ background: "var(--color-ink)", color: "var(--color-page)", borderColor: "var(--color-ink)" }}>Rechercher</button>
          </form>

          {documents.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}>
              <div className="ic"><i className="ph ph-files"></i></div>
              <h3 className="t">Bibliothèque <em>vide</em></h3>
              <p className="s">{q || category ? "Aucun document ne correspond à ces filtres." : "Téléversez votre premier document pour démarrer."}</p>
              <DocumentUploader buttonLabel="Téléverser le premier document" />
            </div>
          ) : (
            <>
              {pinned_docs.length > 0 && !pinned && !category && !q && (
                <>
                  <div className="bb-sec-h">
                    <h3><em>Épinglés</em> par l&apos;équipe</h3>
                    <span className="ct">{pinned_docs.length} document{pinned_docs.length > 1 ? "s" : ""}</span>
                  </div>
                  <DocumentList documents={pinned_docs} />
                </>
              )}

              {!pinned && !category && !q && recents.length > 0 && (
                <>
                  <div className="bb-sec-h" style={{ marginTop: 24 }}>
                    <h3>Ajoutés <em>récemment</em></h3>
                    <span className="ct">{recents.length} fichier{recents.length > 1 ? "s" : ""}</span>
                  </div>
                  <DocumentList documents={recents} />
                </>
              )}

              {(pinned || category || q) && (
                <>
                  <div className="bb-sec-h">
                    <h3>
                      {pinned ? <><em>Épinglés</em></> : null}
                      {category ? <em>{CATEGORIES.find((c) => c.v === category)?.label ?? category}</em> : null}
                      {q ? <>Résultats pour <em>&ldquo;{q}&rdquo;</em></> : null}
                    </h3>
                    <span className="ct">{documents.length} document{documents.length > 1 ? "s" : ""}</span>
                  </div>
                  <DocumentList documents={documents} />
                </>
              )}

              {!pinned && !category && !q && templates.length > 0 && (
                <>
                  <div className="bb-sec-h" style={{ marginTop: 24 }}>
                    <h3>Modèles <em>réutilisables</em></h3>
                    <span className="ct">{templates.length} modèle{templates.length > 1 ? "s" : ""}</span>
                  </div>
                  <DocumentList documents={templates} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
