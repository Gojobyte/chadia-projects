"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface Projet {
  id: string; titre: string; reference: string | null; statut: string;
  budget: number | null; devise: string; dateLimite: string; progression: number;
  pays?: string | null; scoreIA?: number | null; starred?: boolean;
  bailleur: { sigle: string };
  _count: { documents: number; taches: number; membres: number };
  membres?: { user: { id: string; name: string } }[];
}

const statusLabels: Record<string, string> = {
  BROUILLON: "Brouillon", EN_COURS: "Rédaction", EN_REVISION: "Relecture",
  SOUMIS: "Soumis", ACCEPTE: "Accepté", REJETE: "Rejeté",
  REDACTION: "Rédaction", RELECTURE: "Relecture", VALIDATION: "Validation",
  FINALISATION: "Finalisation",
};

const statusKeys: Record<string, string> = {
  BROUILLON: "brouillon", EN_COURS: "redaction", EN_REVISION: "relecture",
  REDACTION: "redaction", RELECTURE: "relecture", VALIDATION: "validation",
  FINALISATION: "finalisation", SOUMIS: "soumis", ACCEPTE: "accepte", REJETE: "rejete",
};

// Couleurs bailleur en oklch — comme dans le design
const bailleurColors: Record<string, string> = {
  PNUD: "oklch(0.55 0.18 245)", UE: "oklch(0.55 0.18 270)",
  BADEA: "oklch(0.55 0.15 30)", AFD: "oklch(0.55 0.15 0)",
  USAID: "oklch(0.55 0.15 240)", BM: "oklch(0.5 0.15 200)",
  UNICEF: "oklch(0.55 0.15 240)", OMS: "oklch(0.5 0.15 200)",
  PAM: "oklch(0.55 0.15 50)", FAO: "oklch(0.55 0.15 150)",
  FIDA: "oklch(0.55 0.15 180)", GLAAS: "oklch(0.55 0.15 240)",
};

// Couleurs avatars en oklch comme dans le design (par user)
const avatarColorList = [
  "oklch(0.6 0.15 165)", "oklch(0.6 0.16 290)", "oklch(0.65 0.15 75)",
  "oklch(0.6 0.13 245)", "oklch(0.62 0.13 25)", "oklch(0.55 0.1 200)",
];

const deviseSymbol: Record<string, string> = { EUR: "€", USD: "$", FCFA: "FCFA", GBP: "£" };

function fmtMoney(n: number, cur = "FCFA"): string {
  const sym = deviseSymbol[cur] ?? cur;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${sym}`;
}

function daysUntil(d: string): number { return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

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
          <div className="page-subtitle">{filtered.length} projets · pipeline total {fmtMoney(totalBudget, "EUR")}</div>
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
          { id: "won", label: "Gagnés", count: projets.filter(p => p.statut === "ACCEPTE").length },
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

      {/* ─── TABLE VIEW ─── */}
      {view === "table" && (
        filtered.length === 0 ? (
          <div className="card" style={{ padding: "48px 18px", textAlign: "center" }}>
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Aucun projet.</div>
            <Link href="/projets/nouveau" className="btn btn-primary" style={{ marginTop: 12 }}>Créer un projet</Link>
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
                    <th>Pays</th>
                    <th>Budget</th>
                    <th>Statut</th>
                    <th>Avancement</th>
                    <th>Échéance</th>
                    <th>Équipe</th>
                    <th>Score IA</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const days = daysUntil(p.dateLimite);
                    const bColor = bailleurColors[p.bailleur.sigle] ?? "oklch(0.55 0.13 200)";
                    // DeadlineLabel logic from design
                    let dlColor = "var(--text-3)";
                    let dlPrefix = "";
                    if (days < 0) { dlColor = "var(--danger)"; dlPrefix = "Dépassée · "; }
                    else if (days === 0) { dlColor = "var(--danger)"; dlPrefix = "Aujourd'hui · "; }
                    else if (days <= 3) { dlColor = "var(--warning)"; dlPrefix = `J-${days} · `; }
                    else if (days <= 14) { dlColor = "var(--text-2)"; dlPrefix = `J-${days} · `; }

                    return (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/projets/${p.id}`}>
                        {/* Étoile — remplie si starred, sinon outline */}
                        <td>
                          {p.starred
                            ? <Icons.Star size={13} style={{ color: "var(--warning)", fill: "var(--warning)" }} />
                            : <Icons.Star size={13} style={{ color: "var(--text-4)" }} />
                          }
                        </td>
                        {/* Projet + référence */}
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 13 }}>{p.titre}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>{p.reference ?? "—"}</div>
                        </td>
                        {/* Bailleur — carré arrondi avec effet 3D comme le design */}
                        <td>
                          <div style={{
                            width: 26, height: 26, borderRadius: 6, background: bColor, color: "white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 9, letterSpacing: "0.02em",
                            boxShadow: "inset 0 -6px 12px rgba(0,0,0,0.15)",
                          }}>
                            {p.bailleur.sigle}
                          </div>
                        </td>
                        {/* Pays */}
                        <td style={{ fontSize: 12.5 }}>{p.pays ?? "—"}</td>
                        {/* Budget */}
                        <td className="tnum" style={{ fontWeight: 500, color: "var(--text)" }}>
                          {p.budget ? fmtMoney(p.budget, p.devise) : "—"}
                        </td>
                        {/* Statut — pill avec dot */}
                        <td>
                          <span className={`pill pill-${statusKeys[p.statut] ?? "brouillon"}`}>
                            <span className="dot" />
                            {statusLabels[p.statut] ?? p.statut}
                          </span>
                        </td>
                        {/* Avancement — progress bar */}
                        <td style={{ width: 140 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <div className="progress" style={{ width: "100%" }}>
                              <span style={{ width: `${p.progression}%` }} />
                            </div>
                            <span className="tnum" style={{ fontSize: 11.5, color: "var(--text-3)", minWidth: 28 }}>{p.progression}%</span>
                          </div>
                        </td>
                        {/* Échéance — DeadlineLabel style */}
                        <td>
                          <span className="tnum" style={{ color: dlColor, fontSize: 12.5 }}>
                            {dlPrefix}{fmtDate(p.dateLimite)}
                          </span>
                        </td>
                        {/* Équipe — AvatarStack */}
                        <td>
                          <div className="avatar-stack">
                            {(p.membres ?? []).slice(0, 3).map((m, i) => {
                              const initials = m.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                              return (
                                <span key={m.user.id} className="avatar avatar-sm" style={{
                                  background: avatarColorList[i % avatarColorList.length],
                                  width: 22, height: 22, fontSize: 9,
                                }}>
                                  {initials}
                                </span>
                              );
                            })}
                            {(p._count.membres ?? 0) > 3 && (
                              <span className="avatar avatar-sm" style={{
                                background: "var(--surface-3)", color: "var(--text-2)",
                                width: 22, height: 22, fontSize: 9,
                              }}>
                                +{p._count.membres - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Score IA */}
                        <td>
                          {p.scoreIA != null ? (
                            <span className="tnum" style={{
                              fontWeight: 600, fontSize: 12.5,
                              color: p.scoreIA >= 85 ? "var(--success)" : p.scoreIA >= 70 ? "var(--warning)" : "var(--danger)",
                            }}>
                              {p.scoreIA}
                            </span>
                          ) : <span style={{ color: "var(--text-4)", fontSize: 12 }}>—</span>}
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

      {/* ─── KANBAN VIEW ─── */}
      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(220px, 1fr))", gap: 10, overflowX: "auto" }}>
          {["BROUILLON", "EN_COURS", "EN_REVISION", "SOUMIS", "ACCEPTE"].map(s => {
            const items = filtered.filter(p => p.statut === s);
            return (
              <div key={s} className="card" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`pill pill-${statusKeys[s] ?? "brouillon"}`}><span className="dot" />{statusLabels[s] ?? s}</span>
                  <span className="tag">{items.length}</span>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, minHeight: 200 }}>
                  {items.map(p => {
                    const bColor = bailleurColors[p.bailleur.sigle] ?? "oklch(0.55 0.13 200)";
                    return (
                      <Link key={p.id} href={`/projets/${p.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, cursor: "pointer" }}>
                          <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, background: bColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 700, color: "#fff", boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15)" }}>
                              {p.bailleur.sigle}
                            </div>
                            <span className="mono" style={{ fontSize: 10.5, color: "var(--text-4)" }}>{p.reference ?? "—"}</span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text)", lineHeight: 1.35, marginBottom: 8 }}>{p.titre}</div>
                          <div className="progress"><span style={{ width: `${p.progression}%` }} /></div>
                          <div className="row" style={{ marginTop: 8, gap: 6, fontSize: 11 }}>
                            <span className="tnum" style={{ color: daysUntil(p.dateLimite) <= 7 ? "var(--warning)" : "var(--text-3)", fontSize: 12.5 }}>
                              {daysUntil(p.dateLimite) <= 0 ? "Expiré" : `J-${daysUntil(p.dateLimite)}`} · {fmtDate(p.dateLimite)}
                            </span>
                            <div className="avatar-stack" style={{ marginLeft: "auto" }}>
                              {(p.membres ?? []).slice(0, 2).map((m, i) => {
                                const initials = m.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                                return (
                                  <span key={m.user.id} className="avatar avatar-sm" style={{
                                    background: avatarColorList[i % avatarColorList.length],
                                    width: 20, height: 20, fontSize: 8,
                                  }}>
                                    {initials}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TIMELINE VIEW ─── */}
      {view === "timeline" && <ProjectsTimeline projects={filtered} />}
    </>
  );
}

/* ─── Timeline Gantt ─── */
function ProjectsTimeline({ projects }: { projects: Projet[] }) {
  if (projects.length === 0) {
    return <div className="card" style={{ padding: 48, textAlign: "center" }}><p style={{ color: "var(--text-4)", fontSize: 13 }}>Aucun projet</p></div>;
  }

  // Fixed months like in the design: Avr–Juil 2026
  const months = ["Avr 2026", "Mai 2026", "Juin 2026", "Juil 2026"];
  const startMs = new Date("2026-04-01").getTime();
  const endMs = new Date("2026-08-01").getTime();
  const span = endMs - startMs;
  const todayPct = ((Date.now() - startMs) / span) * 100;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr" }}>
        <div style={{ borderRight: "1px solid var(--border)", background: "var(--surface-2)", padding: "10px 14px", fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Projet</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${months.length}, 1fr)`, background: "var(--surface-2)" }}>
          {months.map(m => <div key={m} style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderRight: "1px solid var(--border)" }}>{m}</div>)}
        </div>
      </div>

      {projects.map(p => {
        const dlEnd = new Date(p.dateLimite).getTime();
        // Estimer le debut a 45j avant la deadline
        const dlStart = dlEnd - 45 * 864e5;
        const left = Math.max(0, ((dlStart - startMs) / span) * 100);
        const width = Math.min(100 - left, ((dlEnd - dlStart) / span) * 100);
        const color = p.statut === "ACCEPTE" ? "var(--success)" : p.statut === "SOUMIS" ? "var(--st-soumis)" : "var(--primary)";
        const bColor = bailleurColors[p.bailleur.sigle] ?? "oklch(0.55 0.13 200)";

        return (
          <Link key={p.id} href={`/projets/${p.id}`} style={{ textDecoration: "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", borderTop: "1px solid var(--border)", cursor: "pointer", minHeight: 52 }}>
              <div style={{ padding: "12px 14px", borderRight: "1px solid var(--border)" }}>
                <div className="row" style={{ gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: bColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15)" }}>
                    {p.bailleur.sigle}
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
