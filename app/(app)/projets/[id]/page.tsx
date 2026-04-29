"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";

interface Document { id: string; categorie: string; titre: string; statut: string; fichierUrl: string | null; assigneA: { id: string; name: string } | null; }
interface Tache { id: string; titre: string; statut: string; priorite: string; assigneA: { id: string; name: string } | null; }
interface Membre { id: string; role: string; user: { id: string; name: string; email: string }; }
interface Activite { id: string; action: string; description: string; createdAt: string; user: { name: string }; }
interface Projet {
  id: string; titre: string; reference: string | null; description: string; statut: string;
  budget: number | null; devise: string; dateLimite: string; appelOffreUrl: string | null;
  bailleur: { nom: string; sigle: string };
  documents: Document[]; taches: Tache[]; membres: Membre[]; activites: Activite[];
  createdBy: { name: string };
}

const statutColumns = ["A_FAIRE", "EN_COURS", "EN_REVISION", "VALIDE"];
const statutLabels: Record<string, string> = { A_FAIRE: "A faire", EN_COURS: "En cours", EN_REVISION: "En revision", VALIDE: "Valide" };
const statutColors: Record<string, string> = { A_FAIRE: "bg-slate-200", EN_COURS: "bg-blue-200", EN_REVISION: "bg-yellow-200", VALIDE: "bg-green-200" };

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget", BUDGET_DETAIL: "Budget detail",
  CADRE_LOGIQUE: "Cadre logique", NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Gantt", CV: "CV", DOCUMENT_LEGAL: "Docs legaux", AUTRE: "Autre",
};

export default function ProjetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"kanban" | "taches" | "equipe" | "activite">("kanban");

  const load = useCallback(async () => {
    const res = await fetch(`/api/projets/${id}`);
    if (res.ok) { const data = await res.json(); setProjet(data.projet); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function moveDocument(documentId: string, newStatut: string) {
    await fetch(`/api/projets/${id}/documents`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, statut: newStatut }),
    });
    load();
  }

  if (loading) return <p className="text-slate-500">Chargement...</p>;
  if (!projet) return <p className="text-red-500">Projet introuvable.</p>;

  const totalDocs = projet.documents.length;
  const valides = projet.documents.filter(d => d.statut === "VALIDE").length;
  const progression = totalDocs > 0 ? Math.round((valides / totalDocs) * 100) : 0;

  return (
    <div>
      {/* Header projet */}
      <div className="mb-6">
        <Link href="/projets" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">← Retour aux projets</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{projet.titre}</h1>
            <p className="text-sm text-slate-500 mt-1">{projet.bailleur.sigle} — {projet.bailleur.nom} {projet.reference ? `· Ref: ${projet.reference}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Deadline: <span className="font-medium text-slate-900">{new Date(projet.dateLimite).toLocaleDateString("fr-FR")}</span></p>
            {projet.budget && <p className="text-sm text-slate-500">{projet.budget.toLocaleString()} {projet.devise}</p>}
          </div>
        </div>
        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-500">Progression des documents</span>
            <span className="font-medium text-slate-700">{progression}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${progression === 100 ? "bg-green-500" : "bg-indigo-600"}`} style={{ width: `${progression}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["kanban", "taches", "equipe", "activite"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t === "kanban" ? "Documents" : t === "taches" ? "Taches" : t === "equipe" ? "Equipe" : "Activite"}
          </button>
        ))}
      </div>

      {/* Tab: Kanban Documents — Style Trello avec drag & drop */}
      {tab === "kanban" && (
        <KanbanBoard projetId={id} documents={projet.documents} onMoveDocument={moveDocument} />
      )}

      {/* Tab: Taches */}
      {tab === "taches" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {projet.taches.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Aucune tache. Les taches seront ajoutees dans l&apos;Epic 4.</p>
          ) : (
            <div className="space-y-2">
              {projet.taches.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.titre}</p>
                    {t.assigneA && <p className="text-xs text-slate-400">{t.assigneA.name}</p>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    t.statut === "TERMINE" ? "bg-green-100 text-green-800" : t.statut === "EN_COURS" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                  }`}>{t.statut}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Equipe */}
      {tab === "equipe" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-3">
            {projet.membres.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{m.user.name}</p>
                  <p className="text-xs text-slate-400">{m.user.email}</p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Activite */}
      {tab === "activite" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {projet.activites.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Aucune activite.</p>
          ) : (
            <div className="space-y-3">
              {projet.activites.map(a => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-slate-400 w-36 flex-shrink-0">{new Date(a.createdAt).toLocaleString("fr-FR")}</span>
                  <span className="font-medium text-slate-700">{a.user.name}</span>
                  <span className="text-slate-500">{a.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
