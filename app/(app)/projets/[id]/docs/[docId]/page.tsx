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
  const [linkInput, setLinkInput] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editorMode, setEditorMode] = useState<"choose" | "gdoc" | "tiptap">("choose");

  useEffect(() => {
    fetch(`/api/documents/${docId}`)
      .then(r => r.json())
      .then(d => {
        setDoc(d.document);
        if (d.document?.fichierUrl?.includes("docs.google.com")) setEditorMode("gdoc");
        setLoading(false);
      });
  }, [docId]);

  async function changeStatut(statut: string) {
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    setDoc(prev => prev ? { ...prev, statut } : null);
  }

  async function saveGoogleDocLink() {
    if (!linkInput.includes("docs.google.com")) { alert("Ce n'est pas un lien Google Docs valide."); return; }
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fichierUrl: linkInput, statut: "EN_COURS" }),
    });
    setDoc(prev => prev ? { ...prev, fichierUrl: linkInput, statut: "EN_COURS" } : null);
    setEditorMode("gdoc");
    setShowLinkForm(false);
  }

  if (loading) return <p className="text-slate-500 p-8">Chargement...</p>;
  if (!doc) return <p className="text-red-500 p-8">Document introuvable.</p>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projets/${projetId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">← Retour au projet</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doc.titre}</h1>
            <p className="text-sm text-slate-500 mt-1">{doc.projet.titre}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutColors[doc.statut]}`}>{statutLabels[doc.statut]}</span>
            <select value={doc.statut} onChange={e => changeStatut(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-1.5">
              <option value="A_FAIRE">A faire</option>
              <option value="EN_COURS">En cours</option>
              <option value="EN_REVISION">En revision</option>
              <option value="VALIDE">Valide</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mode Google Docs */}
      {editorMode === "gdoc" && doc.fichierUrl && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <a href={doc.fichierUrl} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              📄 Ouvrir dans Google Docs
            </a>
            <button onClick={() => setEditorMode("choose")} className="text-xs text-slate-500 hover:text-slate-700">Changer d&apos;editeur</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <iframe src={doc.fichierUrl.replace("/edit", "/edit?embedded=true")}
              className="w-full border-0" style={{ height: "85vh", minHeight: "800px" }} title={doc.titre} />
          </div>
        </div>
      )}

      {/* Mode TipTap */}
      {editorMode === "tiptap" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setEditorMode("choose")} className="text-xs text-slate-500 hover:text-slate-700">← Changer d&apos;editeur</button>
          </div>
          <DocumentEditor documentId={doc.id} initialContent={doc.contenu ?? ""} projetTitre={doc.projet.titre} />
        </div>
      )}

      {/* Mode choix */}
      {editorMode === "choose" && (
        <div className="space-y-4">
          {/* Option 1 : Google Docs */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📄</div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-800">Google Docs</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Editez dans Google Docs avec toutes les fonctionnalites : styles Word, pagination, sommaire, collaboration en temps reel, export PDF/Word.
                </p>
                <div className="mt-4 space-y-3">
                  {/* Creer un nouveau Google Doc */}
                  <a href={`https://docs.google.com/document/create`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    + Creer un nouveau Google Doc
                  </a>
                  <p className="text-xs text-slate-400">Apres creation, collez le lien ci-dessous pour le lier a ce document.</p>

                  {/* Lier un Google Doc existant */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowLinkForm(!showLinkForm)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                      🔗 Lier un Google Doc existant
                    </button>
                  </div>

                  {showLinkForm && (
                    <div className="flex items-center gap-2 mt-2">
                      <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                        placeholder="https://docs.google.com/document/d/..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      <button onClick={saveGoogleDocLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Lier</button>
                    </div>
                  )}

                  {/* Si un lien existe deja */}
                  {doc.fichierUrl?.includes("docs.google.com") && (
                    <button onClick={() => setEditorMode("gdoc")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                      Ouvrir le Google Doc lie
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Option 2 : Editeur integre */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl">✏️</div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-800">Editeur integre</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Editez directement dans la plateforme avec l&apos;editeur integre. Moins de fonctionnalites que Google Docs mais tout reste dans l&apos;application.
                </p>
                <button onClick={() => setEditorMode("tiptap")}
                  className="mt-4 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                  Utiliser l&apos;editeur integre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
