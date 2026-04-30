"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface Projet {
  id: string; titre: string; reference: string | null; statut: string;
  budget: number | null; devise: string; dateLimite: string; progression: number;
  pays?: string; scoreIA?: number | null;
  bailleur: { sigle: string };
  _count: { documents: number; taches: number; membres: number };
  membres?: { user: { id: string; name: string } }[];
}

const sPill: Record<string, string> = {
  BROUILLON: "pill-brouillon", EN_COURS: "pill-redaction", EN_REVISION: "pill-relecture",
  SOUMIS: "pill-soumis", ACCEPTE: "pill-accepte", REJETE: "pill-rejete",
};
const sLabel: Record<string, string> = {
  BROUILLON: "Brouillon", EN_COURS: "En cours", EN_REVISION: "Revision",
  SOUMIS: "Soumis", ACCEPTE: "Accepte", REJETE: "Rejete",
};

function fmtMoney(n: number, cur = "FCFA"): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M ${cur}` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K ${cur}` : `${n} ${cur}`;
}
function daysUntil(d: string): number { return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); }

export default function ProjetsPage() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"table" | "kanban" | "timeline">("table");

  const load = useCallback(async () => {
    const res = await fetch("/api/projets");
    if (res.ok) { const data = await res.json(); setProjets(data.projets); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = projets.filter(p => {
    if (filter === "active") return !["ACCEPTE", "REJETE", "SOUMIS"].includes(p.statut);
    if (filter === "submitted") return p.statut === "SOUMIS";
    if (filter === "won") return p.statut === "ACCEPTE";
    return true;
  });

  const totalBudget = projets.reduce((s, p) => s + (p.budget ?? 0), 0);

  if (loading) return <div style={{ color: "var(--text-3)", fontSize: 13, padding: 32 }}>Chargement...</div>;

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Projets</div>
          <div className="page-subtitle">{filtered.length} projets · pipeline total {fmtMoney(totalBudget)}</div>
        </div>
        <div className="page-actions" style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary"><Icons.Filter size={14} /> Filtres</button>
          <button className="btn btn-secondary"><Icons.Download size={14} /> Exporter</button>
          <Link href="/projets/nouveau" className="btn btn-primary"><Icons.Plus size={14} /> Nouveau projet</Link>
        </div>
      </div>

      {/* Filter tabs + view toggle */}
      <div className="row" style={{ marginBottom: 16, gap: 4, borderBottom: "1px solid var(--border)" }}>
        {[
          { id: "all", label: "Tous", count: projets.length },
          { id: "active", label: "En cours", count: projets.filter(p => !["ACCEPTE", "REJETE", "SOUMIS"].includes(p.statut)).length },
          { id: "submitted", label: "Soumis", count: projets.filter(p => p.statut === "SOUMIS").length },
          { id: "won", label: "Gagnes", count: projets.filter(p => p.statut === "ACCEPTE").length },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer",
            color: filter === t.id ? "var(--text)" : "var(--text-3)",
            borderBottom: filter === t.id ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            {t.label} <span style={{ fontSize: 11, color: "var(--text-4)", marginLeft: 4 }}>{t.count}</span>
          </button>
        ))}

        {/* View toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 2, padding: 6 }}>
          {([
            { id: "table" as const, icon: Icons.Table, label: "Tableau" },
            { id: "kanban" as const, icon: Icons.Kanban, label: "Kanban" },
            { id: "timeline" as const, icon: Icons.Timeline, label: "Timeline" },
          ]).map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className="btn btn-ghost btn-sm" style={{
                background: view === v.id ? "var(--surface-2)" : "transparent",
                color: view === v.id ? "var(--text)" : "var(--text-3)",
              }}>
              <v.icon size={14} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table view */}
      {view === "table" && (
        filtered.length === 0 ? (
          <div className="card" style={{ padding: "48px 18px", textAlign: "center" }}>
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Aucun projet.</div>
            <Link href="/projets/nouveau" className="btn btn-primary" style={{ marginTop: 12 }}>Creer un projet</Link>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Projet</th>
                    <th>Bailleur</th>
                    <th>Budget</th>
                    <th>Statut</th>
                    <th>Avancement</th>
                    <th>Echeance</th>
                    <th>Equipe</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const days = daysUntil(p.dateLimite);
                    return (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/projets/${p.id}`}>
                        {/* Etoile favori */}
                        <td>
                          <Icons.Star size={13} style={{ color: "var(--text-4)" }} />
                        </td>
                        {/* Projet */}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{p.titre}</div>
                          <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }} className="mono">{p.reference ?? "—"}</div>
                        </td>
                        {/* Bailleur badge */}
                        <td>
                          <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "var(--primary)" }}>
                            {p.bailleur.sigle.slice(0, 3)}
                          </div>
                        </td>
                        {/* Budget */}
                        <td>
                          <span className="tnum" style={{ fontWeight: 500, color: "var(--text)" }}>
                            {p.budget ? fmtMoney(p.budget, p.devise) : "—"}
                          </span>
                        </td>
                        {/* Statut */}
                        <td>
                          <span className={`pill ${sPill[p.statut] ?? "pill-brouillon"}`}>
                            <span className="dot" />{sLabel[p.statut] ?? p.statut}
                          </span>
                        </td>
                        {/* Avancement */}
                        <td style={{ width: 140 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ width: `${p.progression}%`, height: "100%", background: "var(--primary)", borderRadius: 2 }} />
                            </div>
                            <span className="tnum" style={{ fontSize: 11.5, color: "var(--text-3)", minWidth: 28 }}>{p.progression}%</span>
                          </div>
                        </td>
                        {/* Echeance */}
                        <td>
                          <span style={{
                            fontSize: 12, fontWeight: 500,
                            color: days <= 3 ? "var(--danger)" : days <= 7 ? "var(--warning)" : "var(--text-3)",
                          }}>
                            {days <= 0 ? "Expire !" : days === 1 ? "Demain" : `${days}j`}
                          </span>
                        </td>
                        {/* Equipe avatars */}
                        <td>
                          <div style={{ display: "flex" }}>
                            {(p.membres ?? []).slice(0, 3).map((m, i) => (
                              <div key={m.user.id} className="avatar" style={{
                                width: 24, height: 24, fontSize: 9, background: "var(--primary)",
                                marginLeft: i > 0 ? -6 : 0, border: "2px solid var(--surface)",
                                position: "relative", zIndex: 3 - i,
                              }}>
                                {m.user.name.charAt(0)}
                              </div>
                            ))}
                            {(p._count.membres ?? 0) > 3 && (
                              <div className="avatar" style={{
                                width: 24, height: 24, fontSize: 9, background: "var(--surface-3)", color: "var(--text-3)",
                                marginLeft: -6, border: "2px solid var(--surface)",
                              }}>
                                +{p._count.membres - 3}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Kanban view */}
      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(220px, 1fr))", gap: 10, overflowX: "auto" }}>
          {["BROUILLON", "EN_COURS", "EN_REVISION", "SOUMIS", "ACCEPTE"].map(s => {
            const items = filtered.filter(p => p.statut === s);
            return (
              <div key={s} className="card" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`pill ${sPill[s] ?? "pill-brouillon"}`}><span className="dot" />{sLabel[s] ?? s}</span>
                  <span className="tag">{items.length}</span>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
                  {items.map(p => (
                    <Link key={p.id} href={`/projets/${p.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, cursor: "pointer" }}>
                        <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 4, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "var(--primary)" }}>
                            {p.bailleur.sigle.slice(0, 3)}
                          </div>
                          <span className="mono" style={{ fontSize: 10.5, color: "var(--text-4)" }}>{p.reference ?? "—"}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text)", lineHeight: 1.35, marginBottom: 8 }}>{p.titre}</div>
                        <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${p.progression}%`, height: "100%", background: "var(--primary)", borderRadius: 2 }} />
                        </div>
                        <div className="row" style={{ marginTop: 8, gap: 6, fontSize: 11 }}>
                          <span style={{ color: daysUntil(p.dateLimite) <= 7 ? "var(--warning)" : "var(--text-3)" }}>
                            {daysUntil(p.dateLimite) <= 0 ? "Expire !" : `${daysUntil(p.dateLimite)}j`}
                          </span>
                          <div style={{ marginLeft: "auto", display: "flex" }}>
                            {(p.membres ?? []).slice(0, 2).map((m, i) => (
                              <div key={m.user.id} className="avatar" style={{
                                width: 20, height: 20, fontSize: 8, background: "var(--primary)",
                                marginLeft: i > 0 ? -4 : 0, border: "2px solid var(--surface)",
                              }}>
                                {m.user.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline view */}
      {view === "timeline" && <ProjectsTimeline projects={filtered} />}
    </>
  );
}

/* ─── Timeline Gantt pour les projets ─── */
function ProjectsTimeline({ projects }: { projects: Projet[] }) {
  if (projects.length === 0) {
    return <div className="card" style={{ padding: 48, textAlign: "center" }}><p style={{ color: "var(--text-4)", fontSize: 13 }}>Aucun projet</p></div>;
  }

  // Calculer la plage a partir des deadlines
  const deadlines = projects.map(p => new Date(p.dateLimite).getTime());
  const now = Date.now();
  const startMs = Math.min(now - 30 * 864e5, ...deadlines.map(d => d - 60 * 864e5));
  const endMs = Math.max(now + 30 * 864e5, ...deadlines.map(d => d + 14 * 864e5));
  const span = endMs - startMs;

  // Labels mois
  const months: { label: string; pos: number }[] = [];
  const d = new Date(startMs);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (d.getTime() <= endMs) {
    months.push({
      label: d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      pos: ((d.getTime() - startMs) / span) * 100,
    });
    d.setMonth(d.getMonth() + 1);
  }

  const todayPct = ((now - startMs) / span) * 100;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}>
        <div style={{ borderRight: "1px solid var(--border)", background: "var(--surface-2)", padding: "10px 14px", fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Projet</div>
        <div style={{ background: "var(--surface-2)", position: "relative", height: 38 }}>
          {months.map(m => (
            <div key={m.label} style={{ position: "absolute", left: `${m.pos}%`, padding: "10px 8px", fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {projects.map(p => {
        const dlEnd = new Date(p.dateLimite).getTime();
        const dlStart = dlEnd - 30 * 864e5; // 30 jours de duree estimee
        const left = Math.max(0, ((dlStart - startMs) / span) * 100);
        const width = Math.min(100 - left, ((dlEnd - dlStart) / span) * 100);
        const color = p.statut === "ACCEPTE" ? "var(--success)" : p.statut === "SOUMIS" ? "var(--st-soumis)" : "var(--primary)";

        return (
          <Link key={p.id} href={`/projets/${p.id}`} style={{ textDecoration: "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", borderTop: "1px solid var(--border)", cursor: "pointer", minHeight: 52 }}>
              <div style={{ padding: "12px 14px", borderRight: "1px solid var(--border)" }}>
                <div className="row" style={{ gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 700, color: "var(--primary)", flexShrink: 0 }}>
                    {p.bailleur.sigle.slice(0, 3)}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.titre}</div>
                </div>
              </div>
              <div style={{ position: "relative", padding: "10px 0" }}>
                <div style={{
                  position: "absolute", top: "50%", transform: "translateY(-50%)",
                  left: `${left}%`, width: `${width}%`, height: 24,
                  background: `color-mix(in oklch, ${color} 18%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${color} 50%, transparent)`,
                  borderRadius: 6, padding: "3px 10px",
                  display: "flex", alignItems: "center",
                  fontSize: 11, fontWeight: 600, color: "var(--text-2)",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${p.progression}%`, background: `color-mix(in oklch, var(--primary) 18%, transparent)`, borderRight: "2px solid var(--primary)" }} />
                  <span style={{ position: "relative" }}>{p.progression}%</span>
                </div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${todayPct}%`, borderLeft: "2px dashed var(--accent)", zIndex: 1 }} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
