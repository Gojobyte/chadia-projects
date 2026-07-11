"use client";

import { useState, useEffect } from "react";

interface Props {
  id: string;
  nom: string;
  mimeType?: string | null;
  size?: number | null;
  /** Bouton de déclenchement personnalisé. Si absent, on rend un bouton ghost. */
  trigger?: React.ReactNode;
}

/**
 * Aperçu d'un document dans une modal plein écran. Utilise le viewer natif
 * du navigateur via une iframe pointant vers `/api/tender/documents/:id/file`
 * qui sert le fichier avec Content-Disposition: inline.
 *
 * Formats supportés sans config : PDF, images (PNG/JPG/SVG), texte brut.
 * Pour DOCX/XLSX/PPTX, on propose un téléchargement (le navigateur n'a pas
 * de viewer natif — c'est la limite de Google Docs/OnlyOffice qu'on intégrera
 * dans une prochaine itération).
 */
export function DocumentPreview({ id, nom, mimeType, size, trigger }: Props) {
  const [open, setOpen] = useState(false);

  const url = `/api/tender/documents/${id}/file`;
  const mt = (mimeType ?? "").toLowerCase();
  const isPdf = mt.includes("pdf");
  const isImage = mt.startsWith("image/");
  const isText = mt.startsWith("text/") || mt.includes("json");
  const isPreviewable = isPdf || isImage || isText;

  // Ferme la modal sur Escape — convention browser
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    // Bloque le scroll en arrière-plan pendant la preview
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [open]);

  const triggerEl = trigger ?? (
    <button type="button" className="btn btn--ghost btn--sm" title="Aperçu">
      <i className="ph ph-eye" aria-hidden="true"></i>
    </button>
  );

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ display: "inline-flex", cursor: "pointer" }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpen(true); }}>
        {triggerEl}
      </span>

      {open ? (
        <div
          className="doc-preview-backdrop"
          onClick={(e) => {
            // Click extérieur ferme la modal
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="doc-preview-frame">
            <header className="doc-preview-h">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    color: "var(--color-ink)",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nom}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-stone)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {(mimeType || "fichier").split("/").pop()?.toUpperCase()}
                  {size ? ` · ${size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} Ko` : `${(size / (1024 * 1024)).toFixed(1)} Mo`}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <a href={url} download={nom} className="btn btn--ghost btn--sm" title="Télécharger">
                  <i className="ph ph-download-simple" aria-hidden="true"></i>
                </a>
                <a href={url} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm" title="Ouvrir dans un nouvel onglet">
                  <i className="ph ph-arrow-square-out" aria-hidden="true"></i>
                </a>
                <button type="button" onClick={() => setOpen(false)} className="btn btn--ghost btn--sm" title="Fermer (Échap)">
                  <i className="ph ph-x" aria-hidden="true"></i>
                </button>
              </div>
            </header>

            <div className="doc-preview-body">
              {isPdf || isText ? (
                <iframe src={url} title={nom} />
              ) : isImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={url} alt={nom} style={{ maxWidth: "100%", maxHeight: "100%", margin: "auto", display: "block", objectFit: "contain" }} />
              ) : !isPreviewable ? (
                <div className="doc-preview-fallback">
                  <i className="ph ph-file" style={{ fontSize: 48, color: "var(--color-mineral)" }} aria-hidden="true"></i>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "var(--color-ink)", margin: "16px 0 6px" }}>
                    Aperçu indisponible
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--color-stone)", maxWidth: 400, lineHeight: 1.5, textAlign: "center" }}>
                    Le navigateur ne sait pas afficher ce type de fichier ({mimeType || "inconnu"}).
                    L&apos;édition en ligne Word/Excel sera disponible quand on intégrera Google Docs.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <a href={url} download={nom} className="btn btn--accent btn--sm">
                      <i className="ph ph-download-simple" aria-hidden="true"></i> Télécharger
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .doc-preview-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(26, 22, 18, 0.6);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: grid;
          place-items: center;
          padding: 24px;
          animation: fadeIn 160ms ease;
        }
        .doc-preview-frame {
          background: var(--color-surface);
          border-radius: 12px;
          width: 100%;
          max-width: 1100px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 60px -20px rgba(26, 22, 18, 0.4);
          overflow: hidden;
        }
        .doc-preview-h {
          padding: 14px 18px;
          border-bottom: 1px solid var(--color-line);
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--color-surface-2);
        }
        .doc-preview-body {
          flex: 1;
          overflow: hidden;
          background: var(--color-page);
          display: flex;
        }
        .doc-preview-body iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }
        .doc-preview-fallback {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 720px) {
          .doc-preview-backdrop { padding: 0; }
          .doc-preview-frame { height: 100vh; border-radius: 0; max-width: 100%; }
        }
      `}</style>
    </>
  );
}
