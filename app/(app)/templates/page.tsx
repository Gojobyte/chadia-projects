"use client";

import { useState, useEffect } from "react";

interface Template { id: string; categorie: string; titre: string; description: string | null; }

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget",
  CADRE_LOGIQUE: "Cadre logique", NOTE_CONCEPTUELLE: "Note conceptuelle",
  PLAN_TRAVAIL: "Plan de travail",
};
const categorieColors: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "bg-blue-100 text-blue-700", BUDGET_PREVISIONNEL: "bg-green-100 text-green-700",
  CADRE_LOGIQUE: "bg-purple-100 text-purple-700", NOTE_CONCEPTUELLE: "bg-orange-100 text-orange-700",
  PLAN_TRAVAIL: "bg-yellow-100 text-yellow-700",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => { setTemplates(d.templates ?? []); setLoading(false); });
  }, []);

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Templates de documents</h1>
      <p className="text-slate-500 text-sm mb-8">
        Modeles reutilisables pour vos reponses aux appels d&apos;offres. Cliquez sur &quot;Charger template&quot; dans l&apos;editeur d&apos;un document pour utiliser un modele.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm p-6">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-3 ${categorieColors[t.categorie] ?? "bg-slate-100 text-slate-700"}`}>
              {categorieLabels[t.categorie] ?? t.categorie}
            </span>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{t.titre}</h2>
            {t.description && <p className="text-sm text-slate-500">{t.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
