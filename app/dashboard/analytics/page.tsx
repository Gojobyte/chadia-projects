"use client";

import { useState } from "react";
import {
  KpiCard,
  ProjectPipelineChart,
  BailleurDistributionChart,
  PipelineMontantsChart,
  TeamPerformanceChart,
  SuccessRateGauge,
} from "@/components/analytics/AnalyticsCharts";
import { ExportButton } from "@/components/export/ExportButton";

// Sample data
const pipelineData = [
  { month: "Jan", soumis: 2, acceptes: 1, rejetes: 0 },
  { month: "Fév", soumis: 3, acceptes: 2, rejetes: 0 },
  { month: "Mar", soumis: 1, acceptes: 1, rejetes: 0 },
  { month: "Avr", soumis: 4, acceptes: 2, rejetes: 1 },
  { month: "Mai", soumis: 3, acceptes: 3, rejetes: 0 },
  { month: "Jun", soumis: 5, acceptes: 3, rejetes: 1 },
  { month: "Jul", soumis: 2, acceptes: 1, rejetes: 0 },
  { month: "Aoû", soumis: 4, acceptes: 3, rejetes: 0 },
  { month: "Sep", soumis: 3, acceptes: 2, rejetes: 1 },
  { month: "Oct", soumis: 5, acceptes: 4, rejetes: 0 },
  { month: "Nov", soumis: 2, acceptes: 1, rejetes: 0 },
  { month: "Déc", soumis: 3, acceptes: 2, rejetes: 0 },
];

const bailleurData = [
  { name: "UNICEF", value: 8, color: "#3b82f6" },
  { name: "Banque Mondiale", value: 5, color: "#10b981" },
  { name: "UE", value: 4, color: "#8b5cf6" },
  { name: "USAID", value: 3, color: "#f59e0b" },
  { name: "AFD", value: 2, color: "#ef4444" },
  { name: "Autres", value: 3, color: "#6b7280" },
];

const montantsData = [
  { statut: "En rédaction", montant: 45000000, count: 8, color: "#8b5cf6" },
  { statut: "Relecture", montant: 28000000, count: 4, color: "#f59e0b" },
  { statut: "Validation", montant: 15000000, count: 2, color: "#3b82f6" },
  { statut: "Soumis", montant: 62000000, count: 10, color: "#10b981" },
  { statut: "Accepté", montant: 38000000, count: 6, color: "#22c55e" },
];

const teamData = [
  { name: "Adoum", documents: 12, commentaires: 28, taches: 15 },
  { name: "Tidjani", documents: 5, commentaires: 35, taches: 8 },
  { name: "Aminatou", documents: 18, commentaires: 14, taches: 22 },
  { name: "Mahamat", documents: 8, commentaires: 42, taches: 10 },
  { name: "Fatime", documents: 3, commentaires: 8, taches: 6 },
];

type Period = "6m" | "1a" | "all";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("1a");

  const totalSoumis = pipelineData.reduce((s, d) => s + d.soumis, 0);
  const totalAcceptes = pipelineData.reduce((s, d) => s + d.acceptes, 0);
  const totalRejetes = pipelineData.reduce((s, d) => s + d.rejetes, 0);
  const tauxSucces = totalSoumis > 0 ? Math.round((totalAcceptes / totalSoumis) * 100) : 0;
  const totalPipeline = montantsData.reduce((s, d) => s + d.montant, 0);

  // Flatten data for export
  const exportData = pipelineData.map((d) => ({
    mois: d.month,
    soumis: d.soumis,
    acceptes: d.acceptes,
    rejetes: d.rejetes,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Tableau de bord et indicateurs de performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 border rounded-md p-0.5">
            {([["6m", "6 mois"], ["1a", "1 an"], ["all", "Tout"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPeriod(val as Period)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  period === val
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ExportButton data={exportData} filename="chadia-analytics" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Taux de succès"
          value={`${tauxSucces}%`}
          change={5}
          changeLabel="vs période précédente"
          icon="🎯"
          color="green"
        />
        <KpiCard
          title="Projets soumis"
          value={totalSoumis}
          change={12}
          changeLabel="vs période précédente"
          icon="📤"
          color="blue"
        />
        <KpiCard
          title="Pipeline total"
          value={`${(totalPipeline / 1000000).toFixed(0)}M FCFA`}
          icon="💰"
          color="amber"
        />
        <KpiCard
          title="Temps moyen"
          value="23 jours"
          change={-8}
          changeLabel="d'amélioration"
          icon="⏱️"
          color="purple"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ProjectPipelineChart data={pipelineData} />
        </div>
        <SuccessRateGauge rate={tauxSucces} total={totalSoumis} acceptes={totalAcceptes} />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BailleurDistributionChart data={bailleurData} />
        <PipelineMontantsChart data={montantsData} />
      </div>

      {/* Charts row 3 */}
      <TeamPerformanceChart data={teamData} />

      {/* Summary table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Résumé par bailleur</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left p-3 font-medium">Bailleur</th>
              <th className="text-right p-3 font-medium">Projets</th>
              <th className="text-right p-3 font-medium">Montant</th>
              <th className="text-center p-3 font-medium">Taux</th>
            </tr>
          </thead>
          <tbody>
            {bailleurData.map((b, i) => {
              const montant = [45000000, 32000000, 28000000, 18000000, 12000000, 15000000][i];
              const taux = [75, 80, 66, 50, 100][i] || 60;
              return (
                <tr key={b.name} className="border-t hover:bg-muted/10">
                  <td className="p-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                    {b.name}
                  </td>
                  <td className="p-3 text-right">{b.value}</td>
                  <td className="p-3 text-right">{(montant / 1000000).toFixed(1)}M FCFA</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      taux >= 70 ? "bg-green-100 text-green-700" : taux >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    }`}>
                      {taux}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
