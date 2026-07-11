import Link from "next/link";
import { DocumentPreview } from "@/components/DocumentPreview";

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

interface Props {
  documents: Document[];
  emptyMessage?: string;
  compact?: boolean;
}

function iconForMime(mime: string | null | undefined): { class: string; label: string } {
  if (!mime) return { class: "zip", label: "FILE" };
  if (mime.includes("pdf")) return { class: "pdf", label: "PDF" };
  if (mime.includes("word") || mime.includes("document")) return { class: "doc", label: "DOC" };
  if (mime.includes("sheet") || mime.includes("excel")) return { class: "xls", label: "XLS" };
  if (mime.includes("presentation") || mime.includes("powerpoint")) return { class: "ppt", label: "PPT" };
  if (mime.includes("zip")) return { class: "zip", label: "ZIP" };
  if (mime.startsWith("image/")) return { class: "doc", label: "IMG" };
  return { class: "zip", label: "FILE" };
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function timeAgo(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function DocumentList({ documents, emptyMessage = "Aucun document.", compact = false }: Props) {
  if (documents.length === 0) {
    return (
      <div className="empty" style={{ padding: 32 }}>
        <div className="ic"><i className="ph ph-files"></i></div>
        <p className="s">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="files">
      <table>
        <thead>
          <tr>
            <th style={{ width: "40%" }}>Fichier</th>
            <th>Type</th>
            <th>Visibilité</th>
            <th>Taille</th>
            <th>Téléversé</th>
            {!compact && <th></th>}
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => {
            const icon = iconForMime(d.mimeType);
            return (
              <tr key={d.id}>
                <td>
                  <div className="file">
                    <span className={`icon ${icon.class}`}>{icon.label}</span>
                    <div className="nm">
                      {d.isPinned && <i className="ph-fill ph-push-pin" style={{ color: "var(--color-terracotta)", marginRight: 4 }}></i>}
                      {d.nom}
                      <small>
                        {d.originalName && d.originalName !== d.nom ? `${d.originalName} · ` : ""}
                        {d.version ? `v${d.version}` : ""}
                      </small>
                    </div>
                  </div>
                </td>
                <td><span className="meta-tag">{d.type.replace(/_/g, " ").toLowerCase()}</span></td>
                <td>
                  <span className={`vis ${d.visibility === "PUBLIC" ? "pub" : d.visibility === "CONFIDENTIEL" ? "conf" : "int"}`}>
                    {d.visibility === "PUBLIC" ? "Public" : d.visibility === "CONFIDENTIEL" ? "Confidentiel" : "Interne"}
                  </span>
                </td>
                <td><span className="stamp">{formatSize(d.taille)}</span></td>
                <td><span className="stamp">{timeAgo(d.createdAt)}</span></td>
                {!compact && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <DocumentPreview
                      id={d.id}
                      nom={d.nom}
                      mimeType={d.mimeType}
                      size={d.taille}
                      trigger={
                        <button
                          type="button"
                          style={{ background: "transparent", border: "none", color: "var(--color-shale)", padding: "4px 8px", fontSize: 13, cursor: "pointer" }}
                          title="Aperçu"
                        >
                          <i className="ph ph-eye"></i>
                        </button>
                      }
                    />
                    <Link
                      href={`/api/tender/documents/${d.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: "transparent", border: "none", color: "var(--color-terracotta)", padding: "4px 8px", textDecoration: "none", fontSize: 13 }}
                    >
                      <i className="ph ph-download-simple"></i> Télécharger
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
