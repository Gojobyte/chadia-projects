"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Bailleur { id: string; nom: string; sigle: string; }

const DOC_OPTIONS = [
  { value: "PROPOSITION_TECHNIQUE", label: "Proposition technique (cahier des charges)" },
  { value: "BUDGET_PREVISIONNEL", label: "Budget previsionnel" },
  { value: "BUDGET_DETAIL", label: "Detail budgetaire" },
  { value: "CADRE_LOGIQUE", label: "Cadre logique" },
  { value: "NOTE_CONCEPTUELLE", label: "Note conceptuelle" },
  { value: "PLAN_TRAVAIL", label: "Plan de travail" },
  { value: "GANTT", label: "Diagramme de Gantt" },
  { value: "CV", label: "CV equipe" },
  { value: "DOCUMENT_LEGAL", label: "Documents legaux" },
];

export default function NouveauProjetPage() {
  const router = useRouter();
  const [bailleurs, setBailleurs] = useState<Bailleur[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre: "", reference: "", description: "", bailleurId: "",
    budget: "", devise: "FCFA", dateLimite: "", appelOffreUrl: "",
    documents: ["PROPOSITION_TECHNIQUE", "BUDGET_PREVISIONNEL", "CADRE_LOGIQUE", "NOTE_CONCEPTUELLE", "PLAN_TRAVAIL"] as string[],
  });

  useEffect(() => {
    fetch("/api/bailleurs").then(r => r.json()).then(d => setBailleurs(d.bailleurs ?? []));
  }, []);

  function toggleDoc(value: string) {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.includes(value)
        ? prev.documents.filter(d => d !== value)
        : [...prev.documents, value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const res = await fetch("/api/projets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, budget: form.budget ? Number(form.budget) : undefined }),
    });
    const data = await res.json(); setLoading(false);
    if (!res.ok) { setError(data.error ?? "Erreur"); return; }
    router.push(`/projets/${data.projet.id}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nouveau projet</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos generales */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Informations generales</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre du projet</label>
            <input value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} required
              placeholder="Ex: Reponse PNUD — Programme Cohesion Sociale 2026"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bailleur</label>
              <select value={form.bailleurId} onChange={e => setForm({...form, bailleurId: e.target.value})} required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Choisir le bailleur...</option>
                {bailleurs.map(b => <option key={b.id} value={b.id}>{b.sigle} — {b.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference appel d&apos;offres</label>
              <input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})}
                placeholder="Ex: PNUD/TCD/2026/001"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required rows={3}
              placeholder="Decrivez brievement l'objet de l'appel d'offres..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
              <input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})}
                placeholder="Montant" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
              <select value={form.devise} onChange={e => setForm({...form, devise: e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg">
                <option>FCFA</option><option>EUR</option><option>USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date limite</label>
              <input type="date" value={form.dateLimite} onChange={e => setForm({...form, dateLimite: e.target.value})} required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lien vers l&apos;appel d&apos;offres (optionnel)</label>
            <input value={form.appelOffreUrl} onChange={e => setForm({...form, appelOffreUrl: e.target.value})}
              placeholder="https://..." className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {/* Documents a produire */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Documents a produire</h2>
          <p className="text-sm text-slate-500 mb-4">Cochez les documents requis pour cet appel d&apos;offres. Ils seront crees automatiquement.</p>
          <div className="space-y-2">
            {DOC_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={form.documents.includes(opt.value)} onChange={() => toggleDoc(opt.value)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium">
            {loading ? "Creation..." : "Creer le projet"}
          </button>
          <button type="button" onClick={() => router.push("/projets")}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm">
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
