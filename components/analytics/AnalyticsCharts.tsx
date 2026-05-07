"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ───

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color?: string;
}

interface ProjectStat {
  month: string;
  soumis: number;
  acceptes: number;
  rejetes: number;
}

interface BailleurStat {
  name: string;
  value: number;
  color: string;
}

interface PipelineStat {
  statut: string;
  montant: number;
  count: number;
  color: string;
}

interface TeamPerformance {
  name: string;
  documents: number;
  commentaires: number;
  taches: number;
}

// ─── KPI Card ───

export function KpiCard({ title, value, change, changeLabel, icon, color = "primary" }: KpiCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositive && "text-green-600",
                  isNegative && "text-red-600",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}
              >
                {isPositive ? "↑" : isNegative ? "↓" : "→"} {Math.abs(change)}%
              </span>
              {changeLabel && (
                <span className="text-[10px] text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
            color === "primary" && "bg-primary/10",
            color === "green" && "bg-green-500/10",
            color === "blue" && "bg-blue-500/10",
            color === "amber" && "bg-amber-500/10",
            color === "red" && "bg-red-500/10",
            color === "purple" && "bg-purple-500/10"
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Project Pipeline Chart ───

interface PipelineChartProps {
  data: ProjectStat[];
}

export function ProjectPipelineChart({ data }: PipelineChartProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Pipeline de projets</h3>
        <p className="text-xs text-muted-foreground">Évolution mensuelle des soumissions</p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAcceptes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSoumis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="acceptes"
            name="Acceptés"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorAcceptes)"
          />
          <Area
            type="monotone"
            dataKey="soumis"
            name="Soumis"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorSoumis)"
          />
          <Area
            type="monotone"
            dataKey="rejetes"
            name="Rejetés"
            stroke="#ef4444"
            fill="none"
            strokeDasharray="4 4"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Bailleur Distribution ───

interface BailleurChartProps {
  data: BailleurStat[];
}

export function BailleurDistributionChart({ data }: BailleurChartProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Performance par bailleur</h3>
        <p className="text-xs text-muted-foreground">Répartition des projets acceptés</p>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              strokeWidth={2}
              stroke="hsl(var(--card))"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs">{item.name}</span>
              </div>
              <span className="text-xs font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline Montants ───

interface PipelineMontantsProps {
  data: PipelineStat[];
}

export function PipelineMontantsChart({ data }: PipelineMontantsProps) {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.montant, 0),
    [data]
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Montants par statut</h3>
        <p className="text-xs text-muted-foreground">
          Total pipeline : <span className="font-medium">{total.toLocaleString("fr-FR")} FCFA</span>
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
          <YAxis type="category" dataKey="statut" tick={{ fontSize: 11 }} width={80} />
          <Tooltip
            formatter={(value) => Number(value).toLocaleString("fr-FR") + " FCFA"}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
            }}
          />
          <Bar dataKey="montant" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Team Performance ───

interface TeamChartProps {
  data: TeamPerformance[];
}

export function TeamPerformanceChart({ data }: TeamChartProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Performance équipe</h3>
        <p className="text-xs text-muted-foreground">Contributions par membre</p>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="documents" name="Documents" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="taches" name="Tâches" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="commentaires" name="Commentaires" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Taux de Succès Gauge ───

interface SuccessRateProps {
  rate: number; // 0-100
  total: number;
  acceptes: number;
}

export function SuccessRateGauge({ rate, total, acceptes }: SuccessRateProps) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col items-center">
      <h3 className="text-sm font-semibold mb-2">Taux de succès</h3>
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={rate >= 50 ? "#10b981" : rate >= 25 ? "#f59e0b" : "#ef4444"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{rate}%</span>
          <span className="text-[10px] text-muted-foreground">{acceptes}/{total}</span>
        </div>
      </div>
    </div>
  );
}
