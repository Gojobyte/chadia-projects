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
        <TachesPanel projetId={id} taches={projet.taches} membres={projet.membres} onReload={load} />
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

// Panneau de gestion des taches
function TachesPanel({ projetId, taches: initialTaches, membres, onReload }: {
  projetId: string;
  taches: Tache[];
  membres: Membre[];
  onReload: () => void;
}) {
  const [taches, setTaches] = useState(initialTaches);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: "", description: "", assigneAId: "", priorite: "MOYENNE", dateLimite: "" });
  const [formLoading, setFormLoading] = useState(false);

  async function createTache(e: React.FormEvent) {
    e.preventDefault(); setFormLoading(true);
    const res = await fetch(`/api/projets/${projetId}/taches`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setTaches(prev => [data.tache, ...prev]);
      setForm({ titre: "", description: "", assigneAId: "", priorite: "MOYENNE", dateLimite: "" });
      setShowForm(false);
      onReload();
    }
    setFormLoading(false);
  }

  async function toggleStatut(tache: Tache) {
    const next = tache.statut === "A_FAIRE" ? "EN_COURS" : tache.statut === "EN_COURS" ? "TERMINE" : "A_FAIRE";
    await fetch(`/api/projets/${projetId}/taches/${tache.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: next }),
    });
    setTaches(prev => prev.map(t => t.id === tache.id ? { ...t, statut: next } : t));
  }

  async function deleteTache(tacheId: string) {
    if (!confirm("Supprimer cette tache ?")) return;
    await fetch(`/api/projets/${projetId}/taches/${tacheId}`, { method: "DELETE" });
    setTaches(prev => prev.filter(t => t.id !== tacheId));
  }

  const statutBadge: Record<string, string> = {
    A_FAIRE: "badge-neutral", EN_COURS: "badge-blue", TERMINE: "badge-success",
  };
  const statutLabel: Record<string, string> = {
    A_FAIRE: "A faire", EN_COURS: "En cours", TERMINE: "Termine",
  };
  const prioBadge: Record<string, string> = {
    HAUTE: "badge-danger", MOYENNE: "badge-warning", BASSE: "badge-neutral",
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-[#1a365d] uppercase tracking-wider">Taches ({taches.length})</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded text-[12px] font-semibold text-white" style={{ background: "#0468b1" }}>
          {showForm ? "Annuler" : "+ Nouvelle tache"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTache} className="p-5 border-b border-[#e2e8f0] bg-[#f8fafc] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Titre</label>
              <input value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} required
                placeholder="Ex: Rediger la section methodologie"
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Assigner a</label>
              <select value={form.assigneAId} onChange={e => setForm({...form, assigneAId: e.target.value})}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]">
                <option value="">Non assigne</option>
                {membres.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Priorite</label>
              <select value={form.priorite} onChange={e => setForm({...form, priorite: e.target.value})}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]">
                <option value="HAUTE">Haute</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="BASSE">Basse</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Date limite</label>
              <input type="date" value={form.dateLimite} onChange={e => setForm({...form, dateLimite: e.target.value})}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Optionnel" className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]" />
            </div>
          </div>
          <button type="submit" disabled={formLoading}
            className="px-4 py-2 rounded text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#0468b1" }}>
            {formLoading ? "Creation..." : "Creer la tache"}
          </button>
        </form>
      )}

      {taches.length === 0 && !showForm ? (
        <div className="p-8 text-center">
          <p className="text-[#94a3b8] text-[13px]">Aucune tache pour ce projet</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f1f5f9]">
          {taches.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#f8fafc] transition-colors group">
              <button onClick={() => toggleStatut(t)} className="flex-shrink-0" title="Changer le statut">
                {t.statut === "TERMINE" ? (
                  <svg className="w-5 h-5 text-[#059669]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 ${t.statut === "EN_COURS" ? "border-[#0468b1] bg-[#e8f4fc]" : "border-[#cbd5e1]"}`} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium ${t.statut === "TERMINE" ? "line-through text-[#94a3b8]" : "text-[#1e293b]"}`}>{t.titre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.assigneA && <span className="text-[10px] text-[#64748b]">{t.assigneA.name}</span>}
                  {t.dateLimite && <span className="text-[10px] text-[#94a3b8]">· {new Date(t.dateLimite).toLocaleDateString("fr-FR")}</span>}
                </div>
              </div>
              <span className={`badge ${prioBadge[t.priorite] ?? "badge-neutral"}`}>
                {t.priorite === "HAUTE" ? "Urgent" : t.priorite === "MOYENNE" ? "Normal" : "Faible"}
              </span>
              <span className={`badge ${statutBadge[t.statut] ?? "badge-neutral"}`}>{statutLabel[t.statut] ?? t.statut}</span>
              <button onClick={() => deleteTache(t.id)} className="text-[#dc2626] opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
