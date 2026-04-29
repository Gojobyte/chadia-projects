"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DocumentEditor } from "@/components/document-editor";

interface Doc {
  id: string; titre: string; categorie: string; statut: string;
  contenu: string | null; fichierUrl: string | null;
  projet: { id: string; titre: string };
  assigneA: { name: string } | null;
}

const statutLabels: Record<string, string> = {
  A_FAIRE: "A faire", EN_COURS: "En cours", EN_REVISION: "En revision", VALIDE: "Valide",
};
const statutColors: Record<string, string> = {
  A_FAIRE: "bg-slate-100 text-slate-700", EN_COURS: "bg-blue-100 text-blue-700",
  EN_REVISION: "bg-yellow-100 text-yellow-700", VALIDE: "bg-green-100 text-green-700",
};

export default function DocumentPage() {
  const params = useParams();
  const projetId = params.id as string;
  const docId = params.docId as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingGDoc, setCreatingGDoc] = useState(false);
  const [gdocError, setGdocError] = useState("");

  useEffect(() => {
    fetch(`/api/documents/${docId}`)
      .then(r => r.json())
      .then(d => { setDoc(d.document); setLoading(false); });
  }, [docId]);

  async function changeStatut(statut: string) {
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  async function createGoogleDoc() {
    setCreatingGDoc(true); setGdocError("");
    try {
      const res = await fetch(`/api/documents/${docId}/create-google-doc`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setGdocError(data.error ?? "Erreur"); return; }
      setDoc(prev => prev ? { ...prev, fichierUrl: data.url } : null);
    } catch {
      setGdocError("Erreur de connexion.");
    } finally {
      setCreatingGDoc(false);
    }
  }

  if (loading) return <p className="text-slate-500 p-8">Chargement...</p>;
  if (!doc) return <p className="text-red-500 p-8">Document introuvable.</p>;

  const hasGoogleDoc = doc.fichierUrl?.includes("docs.google.com");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projets/${projetId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Retour au projet
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doc.titre}</h1>
            <p className="text-sm text-slate-500 mt-1">{doc.projet.titre}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutColors[doc.statut]}`}>
              {statutLabels[doc.statut]}
            </span>
            <select value={doc.statut} onChange={e => changeStatut(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5">
              <option value="A_FAIRE">A faire</option>
              <option value="EN_COURS">En cours</option>
              <option value="EN_REVISION">En revision</option>
              <option value="VALIDE">Valide</option>
            </select>
          </div>
        </div>
        {doc.assigneA && <p className="text-sm text-indigo-600 mt-1">Assigne a : {doc.assigneA.name}</p>}
      </div>

      {/* Google Doc ou Editeur TipTap */}
      {hasGoogleDoc ? (
        /* Google Docs integre */
        <div>
          <div className="flex items-center gap-3 mb-4">
            <a href={doc.fichierUrl!} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.727 6.727H14V0H4.91c-.905 0-1.637.732-1.637 1.636v20.728c0 .904.732 1.636 1.636 1.636h14.182c.904 0 1.636-.732 1.636-1.636V6.727h-6z"/><path d="M16.364 0v5.091h5.091L16.364 0z" opacity=".5"/></svg>
              Ouvrir dans Google Docs
            </a>
            <span className="text-xs text-slate-400">Toutes les modifications sont sauvegardees automatiquement dans Google Docs</span>
          </div>

          {/* Iframe Google Docs */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <iframe
              src={doc.fichierUrl!.replace("/edit", "/edit?embedded=true")}
              className="w-full border-0"
              style={{ height: "85vh", minHeight: "800px" }}
              title={doc.titre}
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      ) : (
        /* Pas de Google Doc — proposer de le creer ou utiliser TipTap */
        <div>
          {/* Bouton creer Google Doc */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Choisir l&apos;editeur</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Utilisez Google Docs pour une experience complete (styles, pagination, collaboration) ou l&apos;editeur integre.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={createGoogleDoc} disabled={creatingGDoc}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14.727 6.727H14V0H4.91c-.905 0-1.637.732-1.637 1.636v20.728c0 .904.732 1.636 1.636 1.636h14.182c.904 0 1.636-.732 1.636-1.636V6.727h-6z"/><path d="M16.364 0v5.091h5.091L16.364 0z" opacity=".5"/></svg>
                  {creatingGDoc ? "Creation..." : "Creer un Google Doc"}
                </button>
              </div>
            </div>
            {gdocError && <p className="text-red-600 text-sm mt-3">{gdocError}</p>}
          </div>

          {/* Editeur TipTap (fallback) */}
          <details className="mb-4">
            <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700 mb-2">
              Ou utiliser l&apos;editeur integre (basique)
            </summary>
            <DocumentEditor documentId={doc.id} initialContent={doc.contenu ?? ""} />
          </details>
        </div>
      )}
    </div>
  );
}
