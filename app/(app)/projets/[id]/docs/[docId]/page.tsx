"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

  async function saveGoogleDocLink() {
    if (!linkInput.includes("docs.google.com")) { alert("Lien Google Docs invalide."); return; }
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fichierUrl: linkInput, statut: "EN_COURS" }),
    });
    setDoc(prev => prev ? { ...prev, fichierUrl: linkInput, statut: "EN_COURS" } : null);
    setShowLinkForm(false); setLinkInput("");
  }

  async function unlinkDoc() {
    await fetch(`/api/documents/${docId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fichierUrl: null }),
    });
    setDoc(prev => prev ? { ...prev, fichierUrl: null } : null);
  }

  if (loading) return <p className="text-slate-500 p-8">Chargement...</p>;
  if (!doc) return <p className="text-red-500 p-8">Document introuvable.</p>;

  const hasGoogleDoc = doc.fichierUrl?.includes("docs.google.com");

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

      {hasGoogleDoc ? (
        /* Google Doc lie — afficher l'iframe */
        <div>
          <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-lg shadow-sm border border-slate-200">
            <a href={doc.fichierUrl!} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              📄 Ouvrir dans Google Docs
            </a>
            <span className="text-xs text-slate-400 flex-1">Sauvegarde automatique par Google Docs</span>
            <button onClick={unlinkDoc} className="text-xs text-red-500 hover:text-red-700">Delier</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
            <iframe src={doc.fichierUrl!.replace("/edit", "/edit?embedded=true")}
              className="w-full border-0" style={{ height: "85vh", minHeight: "800px" }} title={doc.titre} />
          </div>
        </div>
      ) : (
        /* Pas de Google Doc — proposer d'en lier un */
        <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Lier un Google Doc</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Creez un document dans Google Docs puis liez-le ici. Vous pourrez l&apos;editer directement dans la plateforme.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a href="https://docs.google.com/document/create" target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              + Creer un nouveau Google Doc
            </a>
            <p className="text-xs text-slate-400">Puis copiez le lien du document et collez-le ci-dessous</p>
            {showLinkForm ? (
              <div className="flex items-center gap-2 w-full max-w-lg">
                <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  onKeyDown={e => e.key === "Enter" && saveGoogleDocLink()} />
                <button onClick={saveGoogleDocLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Lier</button>
                <button onClick={() => setShowLinkForm(false)} className="text-xs text-slate-500">Annuler</button>
              </div>
            ) : (
              <button onClick={() => setShowLinkForm(true)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                🔗 Coller le lien d&apos;un Google Doc
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
