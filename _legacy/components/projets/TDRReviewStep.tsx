"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import type { TDRAnalysis } from "@/lib/ai/schemas/tdrAnalysis";

interface TDRReviewStepProps {
  analysis: TDRAnalysis;
  onChange: (updated: TDRAnalysis) => void;
  cost?: { tokensIn: number; tokensOut: number; costUsd: number; model: string; durationMs?: number };
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)",
  borderRadius: 6, background: "var(--surface)", fontSize: 13, color: "var(--text)",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-3)",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
};

export function TDRReviewStep({ analysis, onChange, cost }: TDRReviewStepProps) {
  const [tab, setTab] = useState<"general" | "sections" | "criteria" | "warnings">("general");

  function update(path: string, value: unknown) {
    const parts = path.split(".");
    const copy = JSON.parse(JSON.stringify(analysis));
    let obj = copy;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    onChange(copy);
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Vérifiez les informations extraites</h3>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            L&apos;IA a pré-rempli ces données depuis le TDR. Corrigez si nécessaire avant de créer le projet.
          </p>
        </div>
        {cost && (
          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-4)", textAlign: "right" }}>
            <div>{cost.model} · {cost.durationMs ? `${(cost.durationMs / 1000).toFixed(1)}s` : ""}</div>
            <div>{cost.tokensIn + cost.tokensOut} tokens · ${cost.costUsd.toFixed(4)}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {([
          { id: "general" as const, label: "Général" },
          { id: "sections" as const, label: `Sections (${analysis.requiredSections.length})` },
          { id: "criteria" as const, label: `Évaluation (${analysis.evaluationCriteria.length})` },
          { id: "warnings" as const, label: `Alertes (${analysis.complianceWarnings.length})` },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? "var(--text)" : "var(--text-3)",
            borderBottom: tab === t.id ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab Général */}
      {tab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Bailleur</label>
            <input value={analysis.donor.name} onChange={e => update("donor.name", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Programme</label>
            <input value={analysis.donor.program ?? ""} onChange={e => update("donor.program", e.target.value || null)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Référence</label>
            <input value={analysis.donor.referenceNumber ?? ""} onChange={e => update("donor.referenceNumber", e.target.value || null)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Date limite</label>
            <input type="date" value={analysis.timeline.submissionDeadline?.slice(0, 10)} onChange={e => update("timeline.submissionDeadline", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Budget max</label>
            <input type="number" value={analysis.budget.maxAmount ?? ""} onChange={e => update("budget.maxAmount", e.target.value ? Number(e.target.value) : null)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Devise</label>
            <select value={analysis.budget.currency} onChange={e => update("budget.currency", e.target.value)} style={inputStyle}>
              <option>EUR</option><option>USD</option><option>XAF</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pays / zone</label>
            <input value={analysis.eligibility.countries.join(", ")} onChange={e => update("eligibility.countries", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Secteurs</label>
            <input value={analysis.eligibility.sectors.join(", ")} onChange={e => update("eligibility.sectors", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cofinancement requis</label>
            <div className="row" style={{ gap: 8 }}>
              <input type="checkbox" checked={analysis.budget.cofinancingRequired} onChange={e => update("budget.cofinancingRequired", e.target.checked)} style={{ accentColor: "var(--primary)" }} />
              <span style={{ fontSize: 13 }}>{analysis.budget.cofinancingMinPercent ? `Min ${analysis.budget.cofinancingMinPercent}%` : "Non spécifié"}</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Overhead max</label>
            <input type="number" value={analysis.budget.overheadMaxPercent ?? ""} onChange={e => update("budget.overheadMaxPercent", e.target.value ? Number(e.target.value) : null)} style={inputStyle} placeholder="%" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Durée du projet</label>
            <div className="row" style={{ gap: 8 }}>
              <input type="number" value={analysis.timeline.projectDuration?.value ?? ""} onChange={e => update("timeline.projectDuration", e.target.value ? { value: Number(e.target.value), unit: analysis.timeline.projectDuration?.unit ?? "months" } : null)} style={{ ...inputStyle, width: 100 }} />
              <select value={analysis.timeline.projectDuration?.unit ?? "months"} onChange={e => update("timeline.projectDuration", { value: analysis.timeline.projectDuration?.value ?? 12, unit: e.target.value })} style={{ ...inputStyle, width: 100 }}>
                <option value="months">mois</option><option value="years">ans</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab Sections */}
      {tab === "sections" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {analysis.requiredSections.map((s, i) => (
            <div key={i} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{s.description}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                {s.weight && <span className="tag" style={{ background: "var(--primary-soft)", color: "var(--primary)", borderColor: "transparent" }}>{s.weight}%</span>}
                {s.maxPages && <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>{s.maxPages} pages max</div>}
              </div>
            </div>
          ))}
          {analysis.requiredAnnexes.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 8 }}>Annexes obligatoires</div>
              {analysis.requiredAnnexes.map((a, i) => (
                <div key={i} style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-2)" }}>
                  {a.title}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tab Critères */}
      {tab === "criteria" && (
        <div>
          {analysis.evaluationCriteria.map((c, i) => (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < analysis.evaluationCriteria.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="row" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.name}</span>
                <span className="tnum" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "var(--primary)" }}>{c.weight}%</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {c.subcriteria.map((sc, j) => (
                  <span key={j} className="tag" style={{ fontSize: 11 }}>{sc}</span>
                ))}
              </div>
            </div>
          ))}
          {analysis.keyQuestions.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 16, marginBottom: 8 }}>
                Questions stratégiques ({analysis.keyQuestions.length})
              </div>
              {analysis.keyQuestions.map((q, i) => (
                <div key={i} className="row" style={{ gap: 8, padding: "6px 0", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--primary)", fontWeight: 600, fontSize: 12, minWidth: 20 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>{q}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tab Alertes */}
      {tab === "warnings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {analysis.complianceWarnings.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--success)" }}>
              <Icons.Check size={20} style={{ margin: "0 auto 8px", display: "block" }} />
              Aucune alerte de conformité détectée
            </div>
          ) : analysis.complianceWarnings.map((w, i) => (
            <div key={i} className="row" style={{ gap: 10, padding: "10px 12px", background: "var(--warning-soft)", border: "1px solid color-mix(in oklch, var(--warning) 30%, transparent)", borderRadius: 8, alignItems: "flex-start" }}>
              <Icons.AlertCircle size={16} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "var(--text)" }}>{w}</span>
            </div>
          ))}

          {/* Marqueurs transversaux */}
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 12, marginBottom: 4 }}>Marqueurs transversaux</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: "Genre (CAD-OCDE)", value: analysis.crossCuttingRequirements.genderMarker },
              { label: "Environnement", value: analysis.crossCuttingRequirements.environmentMarker },
              { label: "Gouvernance", value: analysis.crossCuttingRequirements.governanceMarker },
              { label: "Adaptation climatique", value: analysis.crossCuttingRequirements.climateAdaptation ? "Oui" : "Non" },
              { label: "Do No Harm", value: analysis.crossCuttingRequirements.doNoHarm ? "Oui" : "Non" },
              { label: "Approche NEXUS", value: analysis.crossCuttingRequirements.nexusApproach ? "Oui" : "Non" },
            ].map((m, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", padding: "6px 10px", background: "var(--surface-2)", borderRadius: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{m.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{m.value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
