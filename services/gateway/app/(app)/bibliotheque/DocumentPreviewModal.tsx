"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog } from "@/components/Dialog";

interface DocLike {
  id: string;
  nom: string;
  mimeType?: string | null;
  taille?: number | null;
  originalName?: string | null;
}

interface Props {
  doc: DocLike | null;
  onClose: () => void;
}

/** Catégorise le format pour choisir le mode de rendu. */
type PreviewMode = "pdf-iframe" | "docx-html" | "xlsx-table" | "image" | "text" | "download-only";

function detectMode(doc: DocLike): PreviewMode {
  const mime = (doc.mimeType ?? "").toLowerCase();
  const name = (doc.originalName ?? doc.nom ?? "").toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf-iframe";
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|heic)$/.test(name)) return "image";
  if (mime.startsWith("text/")) return "text";
  // DOCX = format Office Open XML moderne (depuis Word 2007). mammoth le gère.
  if (mime.includes("wordprocessingml") || name.endsWith(".docx")) return "docx-html";
  // XLSX / XLS / XLSM / ODS — SheetJS gère tout ça
  if (
    mime.includes("spreadsheetml") ||
    mime.includes("ms-excel") ||
    /\.(xlsx?|xlsm|ods|csv)$/.test(name)
  ) return "xlsx-table";
  // .doc (ancien Word binaire pré-2007) : pas de lib JS fiable → download
  return "download-only";
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentPreviewModal({ doc, onClose }: Props) {
  const open = !!doc;
  return (
    <Dialog open={open} onClose={onClose} title={doc?.nom ?? "Aperçu"} maxWidth={1100}>
      {doc ? <PreviewContent doc={doc} onClose={onClose} /> : null}
    </Dialog>
  );
}

function PreviewContent({ doc, onClose }: { doc: DocLike; onClose: () => void }) {
  const fileUrl = `/api/documents/${doc.id}/file`;
  const mode = detectMode(doc);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = doc.originalName ?? doc.nom;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [fileUrl, doc.originalName, doc.nom]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "85vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          borderBottom: "1px solid var(--color-line)",
          background: "var(--color-surface)",
        }}
      >
        <i
          className={
            mode === "pdf-iframe" ? "ph ph-file-pdf" :
            mode === "docx-html" ? "ph ph-file-doc" :
            mode === "xlsx-table" ? "ph ph-file-xls" :
            mode === "image" ? "ph ph-image" :
            "ph ph-file"
          }
          style={{ fontSize: 22, color: "var(--color-terracotta)" }}
          aria-hidden="true"
        ></i>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.nom}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)" }}>
            {doc.mimeType ?? "fichier"} · {formatSize(doc.taille)}
            {mode === "docx-html" || mode === "xlsx-table" ? " · rendu approximatif" : ""}
          </div>
        </div>
        <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" title="Ouvrir dans un nouvel onglet" style={{ height: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i className="ph ph-arrow-square-out" aria-hidden="true"></i>
          Nouvel onglet
        </a>
        <button type="button" onClick={handleDownload} className="btn btn--ghost btn--sm" title="Télécharger" style={{ height: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i className="ph ph-download-simple" aria-hidden="true"></i>
          Télécharger
        </button>
        <button type="button" onClick={onClose} aria-label="Fermer l'aperçu" className="btn btn--ghost btn--sm" style={{ height: 32, width: 32, padding: 0, display: "grid", placeItems: "center" }}>
          <i className="ph ph-x" aria-hidden="true"></i>
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, background: "var(--color-canvas)", position: "relative", overflow: "hidden" }}>
        {mode === "pdf-iframe" && <PdfPreview url={fileUrl} title={doc.nom} />}
        {mode === "image" && <ImagePreview url={fileUrl} alt={doc.nom} />}
        {mode === "text" && <TextPreview url={fileUrl} />}
        {mode === "docx-html" && <DocxPreview url={fileUrl} />}
        {mode === "xlsx-table" && <XlsxPreview url={fileUrl} />}
        {mode === "download-only" && <DownloadOnly onDownload={handleDownload} />}
      </div>
    </div>
  );
}

// ============================================================================
// Sous-vues par type
// ============================================================================

function PdfPreview({ url, title }: { url: string; title: string }) {
  return <iframe src={url} title={title} style={{ width: "100%", height: "100%", border: "none", display: "block", background: "white" }} />;
}

function ImagePreview({ url, alt }: { url: string; alt: string }) {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", display: "grid", placeItems: "center", padding: 16 }}>
      <img src={url} alt={alt} style={{ maxWidth: "100%", height: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(url, { credentials: "include" })
      .then((r) => r.ok ? r.text() : Promise.reject(`HTTP ${r.status}`))
      .then(setText)
      .catch((e) => setErr(String(e)));
  }, [url]);
  if (err) return <ErrorBox message={err} />;
  if (text === null) return <Loading />;
  return (
    <pre style={{ width: "100%", height: "100%", overflow: "auto", padding: 20, margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "pre-wrap", color: "var(--color-ink)", background: "white" }}>
      {text}
    </pre>
  );
}

/**
 * DOCX → HTML via mammoth (lazy import, ~200 KB).
 * Mammoth lit le .docx (zip + xml) et retourne du HTML semi-structuré.
 * On l'injecte tel quel — le risque XSS est minimal car le contenu vient
 * d'un fichier que l'utilisateur a uploadé lui-même, et mammoth strip
 * déjà les éléments dangereux.
 */
function DocxPreview({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Imports lazy — ne charge mammoth que si on ouvre un DOCX.
        const [{ default: mammoth }, blob] = await Promise.all([
          import("mammoth"),
          fetch(url, { credentials: "include" }).then((r) => r.ok ? r.arrayBuffer() : Promise.reject(`HTTP ${r.status}`)),
        ]);
        if (cancelled) return;
        const result = await mammoth.convertToHtml({ arrayBuffer: blob });
        if (cancelled) return;
        setHtml(result.value);
        setWarnings(result.messages.slice(0, 3).map((m) => m.message));
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (err) return <ErrorBox message={`Conversion DOCX échouée : ${err}`} />;
  if (html === null) return <Loading label="Conversion du document Word…" />;

  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto", background: "white" }}>
      {warnings.length > 0 ? (
        <div style={{ padding: "8px 16px", background: "var(--color-warning-soft)", borderBottom: "1px solid rgba(237,108,2,0.18)", fontSize: 11, color: "var(--color-warning)" }}>
          <i className="ph ph-info" aria-hidden="true" style={{ marginRight: 4 }}></i>
          Rendu partiel · {warnings.length} alerte{warnings.length > 1 ? "s" : ""} : {warnings.join(" · ")}
        </div>
      ) : null}
      <div
        className="docx-preview-content"
        style={{ padding: "40px 60px", maxWidth: 900, margin: "0 auto", fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.6, color: "#2c241c" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <style>{`
        .docx-preview-content h1 { font-size: 24px; margin-top: 24px; }
        .docx-preview-content h2 { font-size: 20px; margin-top: 20px; }
        .docx-preview-content h3 { font-size: 16px; margin-top: 16px; }
        .docx-preview-content p { margin: 12px 0; }
        .docx-preview-content table { border-collapse: collapse; margin: 12px 0; width: 100%; }
        .docx-preview-content table td, .docx-preview-content table th { border: 1px solid #ccc; padding: 6px 10px; }
        .docx-preview-content ul, .docx-preview-content ol { padding-left: 28px; }
        .docx-preview-content img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}

/**
 * XLSX/XLS/CSV → HTML table via SheetJS (lazy import, ~500 KB).
 * On rend une feuille à la fois, avec des onglets si plusieurs feuilles.
 */
function XlsxPreview({ url }: { url: string }) {
  const [workbook, setWorkbook] = useState<{ SheetNames: string[]; Sheets: Record<string, unknown> } | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [sheetHtml, setSheetHtml] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [XLSXModule, setXLSXModule] = useState<typeof import("xlsx") | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [XLSX, arrayBuffer] = await Promise.all([
          import("xlsx"),
          fetch(url, { credentials: "include" }).then((r) => r.ok ? r.arrayBuffer() : Promise.reject(`HTTP ${r.status}`)),
        ]);
        if (cancelled) return;
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        setWorkbook(wb as never);
        setXLSXModule(XLSX);
        setActiveSheet(wb.SheetNames[0]);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Re-render quand la feuille active change
  useEffect(() => {
    if (!workbook || !activeSheet || !XLSXModule) return;
    const sheet = workbook.Sheets[activeSheet];
    if (!sheet) return;
    const html = XLSXModule.utils.sheet_to_html(sheet as never, { editable: false });
    setSheetHtml(html);
  }, [workbook, activeSheet, XLSXModule]);

  if (err) return <ErrorBox message={`Lecture Excel échouée : ${err}`} />;
  if (!workbook) return <Loading label="Conversion du tableau Excel…" />;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "white" }}>
      {workbook.SheetNames.length > 1 ? (
        <div style={{ display: "flex", gap: 4, padding: "8px 12px", borderBottom: "1px solid var(--color-line)", overflowX: "auto", background: "var(--color-canvas)" }}>
          {workbook.SheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(name)}
              className="pill"
              style={{
                padding: "4px 10px",
                fontSize: 11,
                background: activeSheet === name ? "var(--color-ink)" : "var(--color-surface)",
                color: activeSheet === name ? "var(--color-page)" : "var(--color-ink)",
                border: "1px solid var(--color-line)",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="xlsx-preview-content"
        style={{ flex: 1, overflow: "auto", padding: 16 }}
        dangerouslySetInnerHTML={{ __html: sheetHtml }}
      />
      <style>{`
        .xlsx-preview-content table {
          border-collapse: collapse;
          font-size: 12px;
          font-family: var(--font-sans);
        }
        .xlsx-preview-content td, .xlsx-preview-content th {
          border: 1px solid #d0d0d0;
          padding: 4px 8px;
          min-width: 60px;
          text-align: left;
          vertical-align: top;
          white-space: nowrap;
        }
        .xlsx-preview-content tr:first-child td,
        .xlsx-preview-content tr:first-child th {
          background: #f5f0e8;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}

function DownloadOnly({ onDownload }: { onDownload: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, padding: 32, textAlign: "center" }}>
      <i className="ph ph-file" style={{ fontSize: 48, color: "var(--color-stone)" }} aria-hidden="true"></i>
      <div style={{ fontSize: 14, color: "var(--color-sepia)", maxWidth: 420 }}>
        Ce format de fichier (souvent un ancien <code>.doc</code> binaire ou un format propriétaire) ne peut pas être prévisualisé directement. Téléchargez-le pour l&apos;ouvrir dans l&apos;application appropriée.
      </div>
      <button type="button" onClick={onDownload} className="btn btn--accent" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <i className="ph ph-download-simple" aria-hidden="true"></i>
        Télécharger le fichier
      </button>
    </div>
  );
}

function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
      <i className="ph ph-circle-notch" style={{ fontSize: 28, color: "var(--color-terracotta)", animation: "spin 1s linear infinite" }} aria-hidden="true"></i>
      <div style={{ fontSize: 13, color: "var(--color-stone)" }}>{label}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 32, textAlign: "center" }}>
      <i className="ph ph-warning-circle" style={{ fontSize: 32, color: "var(--color-danger)" }} aria-hidden="true"></i>
      <div style={{ fontSize: 13, color: "var(--color-danger)", maxWidth: 480 }}>{message}</div>
    </div>
  );
}
