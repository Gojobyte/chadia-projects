"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Projet {
  id: string; titre: string; reference: string | null; statut: string;
  budget: number | null; devise: string; dateLimite: string; progression: number;
  bailleur: { sigle: string }; _count: { documents: number; taches: number; membres: number };
}

const sPill: Record<string,string> = { BROUILLON:"pill-brouillon", EN_COURS:"pill-redaction", EN_REVISION:"pill-relecture", SOUMIS:"pill-soumis", ACCEPTE:"pill-accepte", REJETE:"pill-rejete" };
const sLabel: Record<string,string> = { BROUILLON:"Brouillon", EN_COURS:"En cours", EN_REVISION:"Revision", SOUMIS:"Soumis", ACCEPTE:"Accepte", REJETE:"Rejete" };

function fmtMoney(n: number, cur = "FCFA"): string { return n >= 1e6 ? `${(n/1e6).toFixed(1)}M ${cur}` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K ${cur}` : `${n} ${cur}`; }
function daysUntil(d: string): number { return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5); }

export default function ProjetsPage() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/projets");
    if (res.ok) { const data = await res.json(); setProjets(data.projets); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = projets.filter(p => {
    if (filter === "active") return !["ACCEPTE","REJETE","SOUMIS"].includes(p.statut);
    if (filter === "submitted") return p.statut === "SOUMIS";
    if (filter === "won") return p.statut === "ACCEPTE";
    return true;
  });

  const totalBudget = projets.reduce((s, p) => s + (p.budget ?? 0), 0);

  if (loading) return <div style={{color:"var(--text-3)",fontSize:13,padding:32}}>Chargement...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Projets</div>
          <div className="page-subtitle">{filtered.length} projets · pipeline total {fmtMoney(totalBudget)}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Link href="/projets/nouveau" className="btn btn-primary">+ Nouveau projet</Link>
        </div>
      </div>

      {/* Tabs filtre */}
      <div className="row" style={{marginBottom:16,gap:4,borderBottom:"1px solid var(--border)"}}>
        {[
          {id:"all",label:"Tous",count:projets.length},
          {id:"active",label:"En cours",count:projets.filter(p=>!["ACCEPTE","REJETE","SOUMIS"].includes(p.statut)).length},
          {id:"submitted",label:"Soumis",count:projets.filter(p=>p.statut==="SOUMIS").length},
          {id:"won",label:"Gagnes",count:projets.filter(p=>p.statut==="ACCEPTE").length},
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} className="btn btn-ghost" style={{
            padding:"8px 14px", fontSize:13, fontWeight:500,
            color:filter===t.id?"var(--text)":"var(--text-3)",
            borderBottom:filter===t.id?"2px solid var(--primary)":"2px solid transparent",
            borderRadius:0, marginBottom:-1,
          }}>
            {t.label} <span style={{fontSize:11,color:"var(--text-4)",marginLeft:4}}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{padding:"48px 18px",textAlign:"center"}}>
          <div style={{color:"var(--text-3)",fontSize:13}}>Aucun projet.</div>
          <Link href="/projets/nouveau" className="btn btn-primary" style={{marginTop:12}}>Creer un projet</Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Bailleur</th>
                  <th>Budget</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th style={{textAlign:"right"}}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const days = daysUntil(p.dateLimite);
                  return (
                    <tr key={p.id} style={{cursor:"pointer"}} onClick={() => window.location.href = `/projets/${p.id}`}>
                      <td>
                        <div style={{fontWeight:600,fontSize:13.5,color:"var(--text)"}}>{p.titre}</div>
                        <div style={{fontSize:11,color:"var(--text-4)",marginTop:2}} className="mono">{p.reference ?? "—"}</div>
                      </td>
                      <td>
                        <div style={{width:28,height:28,borderRadius:6,background:"var(--primary-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"var(--primary)"}}>
                          {p.bailleur.sigle.slice(0,3)}
                        </div>
                      </td>
                      <td><span className="tnum">{p.budget ? fmtMoney(p.budget, p.devise) : "—"}</span></td>
                      <td><span className={`pill ${sPill[p.statut]??"pill-brouillon"}`}><span className="dot"/>{sLabel[p.statut]??p.statut}</span></td>
                      <td>
                        <div className="row" style={{gap:6}}>
                          <div className="progress-bar" style={{width:80}}><span style={{width:`${p.progression}%`}}/></div>
                          <span style={{fontSize:11,color:"var(--text-3)"}} className="tnum">{p.progression}%</span>
                        </div>
                      </td>
                      <td style={{textAlign:"right"}}>
                        <div style={{fontSize:12,fontWeight:500,color:days<=3?"var(--danger)":days<=7?"var(--warning)":"var(--text-3)"}}>
                          {days<=0?"Expire !":days===1?"Demain":`${days}j`}
                        </div>
                        <div style={{fontSize:11,color:"var(--text-4)"}}>{new Date(p.dateLimite).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
