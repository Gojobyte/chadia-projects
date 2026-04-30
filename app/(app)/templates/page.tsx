"use client";

import { useState, useEffect } from "react";

interface Template { id: string; categorie: string; titre: string; description: string | null; contenu: string; createdAt: string; }

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget previsionnel",
  BUDGET_DETAIL: "Budget detaille", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV", DOCUMENT_LEGAL: "Documents legaux", AUTRE: "Autre",
};

const categorieColors: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "badge-blue", BUDGET_PREVISIONNEL: "badge-success",
  CADRE_LOGIQUE: "badge-warning", NOTE_CONCEPTUELLE: "badge-danger",
  PLAN_TRAVAIL: "badge-neutral", BUDGET_DETAIL: "badge-success",
  GANTT: "badge-neutral", CV: "badge-blue", DOCUMENT_LEGAL: "badge-neutral", AUTRE: "badge-neutral",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categorie: "PROPOSITION_TECHNIQUE", titre: "", description: "", contenu: "" });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => { setTemplates(d.templates ?? []); setLoading(false); });
  }, []);

  const selected = templates.find(t => t.id === selectedId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setFormLoading(true);
    const res = await fetch("/api/templates", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates(prev => [...prev, data.template]);
      setForm({ categorie: "PROPOSITION_TECHNIQUE", titre: "", description: "", contenu: "" });
      setShowForm(false);
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (loading) return <p className="text-[#94a3b8] p-8">Chargement...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Templates</div>
          <div className="page-subtitle">{templates.length} modeles disponibles</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? "Annuler" : "+ Nouveau template"}
        </button>
      </div>

      {/* Formulaire creation */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Categorie</label>
              <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]">
                {Object.entries(categorieLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Titre</label>
              <input value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} required
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Optionnel" className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase mb-1">Contenu (Markdown)</label>
            <textarea value={form.contenu} onChange={e => setForm({...form, contenu: e.target.value})} required rows={8}
              placeholder="# Titre&#10;## Section 1&#10;Contenu du template..." className="w-full px-3 py-2 border border-[#e2e8f0] rounded text-[13px] font-mono" />
          </div>
          <button type="submit" disabled={formLoading}
            className="px-4 py-2 rounded text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#0468b1" }}>
            {formLoading ? "Creation..." : "Creer le template"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Liste des templates */}
        <div className="col-span-5">
          <div className="space-y-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => setSelectedId(t.id)}
                className={`w-full text-left card p-4 transition-all ${selectedId === t.id ? "ring-2 ring-[#0468b1] border-[#0468b1]" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`badge ${categorieColors[t.categorie] ?? "badge-neutral"}`}>
                    {categorieLabels[t.categorie] ?? t.categorie}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    className="text-[#dc2626] text-[10px] opacity-0 group-hover:opacity-100 hover:underline">✕</button>
                </div>
                <p className="text-[13px] font-semibold text-[#1e293b] mt-1">{t.titre}</p>
                {t.description && <p className="text-[11px] text-[#94a3b8] mt-0.5">{t.description}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Apercu du template */}
        <div className="col-span-7">
          {selected ? (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
                <div>
                  <h2 className="text-[14px] font-bold text-[#1a365d]">{selected.titre}</h2>
                  <span className={`badge ${categorieColors[selected.categorie] ?? "badge-neutral"} mt-1`}>
                    {categorieLabels[selected.categorie]}
                  </span>
                </div>
              </div>
              <div className="p-5 bg-[#f8fafc] max-h-[600px] overflow-y-auto">
                <pre className="text-[12px] text-[#1e293b] whitespace-pre-wrap font-mono leading-relaxed">{selected.contenu}</pre>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-[#94a3b8] text-[13px]">Selectionnez un template pour voir son contenu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
