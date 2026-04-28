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

  if (loading) return <p className="text-slate-500">Chargement...</p>;
  if (!doc) return <p className="text-red-500">Document introuvable.</p>;

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

      {/* Editeur */}
      <DocumentEditor documentId={doc.id} initialContent={doc.contenu ?? ""} />

      {/* Fichier attache */}
      {doc.fichierUrl && (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500 mb-2">Fichier attache :</p>
          <a href={doc.fichierUrl} target="_blank" rel="noopener noreferrer"
            className="text-indigo-600 hover:underline text-sm">{doc.fichierUrl}</a>
        </div>
      )}
    </div>
  );
}
