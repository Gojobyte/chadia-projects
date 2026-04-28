"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Projet {
  id: string; titre: string; reference: string | null; statut: string;
  budget: number | null; devise: string; dateLimite: string; progression: number;
  bailleur: { sigle: string }; _count: { documents: number; taches: number; membres: number };
}

const statutColors: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
  EN_COURS: "bg-blue-100 text-blue-700",
  EN_REVISION: "bg-yellow-100 text-yellow-700",
  SOUMIS: "bg-purple-100 text-purple-700",
  ACCEPTE: "bg-green-100 text-green-700",
  REJETE: "bg-red-100 text-red-700",
  ARCHIVE: "bg-slate-100 text-slate-500",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", EN_COURS: "En cours", EN_REVISION: "En revision",
  SOUMIS: "Soumis", ACCEPTE: "Accepte", REJETE: "Rejete", ARCHIVE: "Archive",
};

export default function ProjetsPage() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/projets");
    if (res.ok) { const data = await res.json(); setProjets(data.projets); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Projets ({projets.length})</h1>
        <Link href="/projets/nouveau" className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
          Nouveau projet
        </Link>
      </div>

      {projets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-slate-500 mb-4">Aucun projet. Creez votre premier projet !</p>
          <Link href="/projets/nouveau" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Creer un projet</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projets.map((p) => (
            <Link key={p.id} href={`/projets/${p.id}`} className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{p.titre}</h2>
                  <p className="text-sm text-slate-500">{p.bailleur.sigle} {p.reference ? `· Ref: ${p.reference}` : ""}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutColors[p.statut] ?? ""}`}>
                  {statutLabels[p.statut] ?? p.statut}
                </span>
              </div>
              <div className="flex items-center gap-6 mb-3">
                {p.budget && <span className="text-sm text-slate-600">{p.budget.toLocaleString()} {p.devise}</span>}
                <span className="text-sm text-slate-500">Deadline: {new Date(p.dateLimite).toLocaleDateString("fr-FR")}</span>
                <span className="text-sm text-slate-400">{p._count.documents} docs · {p._count.membres} membres</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${p.progression === 100 ? "bg-green-500" : "bg-indigo-600"}`}
                  style={{ width: `${p.progression}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{p.progression}% des documents valides</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
