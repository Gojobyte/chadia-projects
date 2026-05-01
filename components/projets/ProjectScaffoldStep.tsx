"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import type { TDRAnalysis } from "@/lib/ai/schemas/tdrAnalysis";

interface ProjectScaffoldStepProps {
  analysis: TDRAnalysis;
  creating: boolean;
  onConfirm: (selectedSections: string[], selectedAnnexes: string[]) => void;
}

export function ProjectScaffoldStep({ analysis, creating, onConfirm }: ProjectScaffoldStepProps) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(analysis.requiredSections.map(s => s.id))
  );
  const [selectedAnnexes, setSelectedAnnexes] = useState<Set<string>>(
    new Set(analysis.requiredAnnexes.map(a => a.id))
  );

  function toggleSection(id: string) {
    setSelectedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAnnex(id: string) {
    setSelectedAnnexes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalDocs = selectedSections.size + selectedAnnexes.size;
  // 2 tâches fixes (lire TDR + soumettre) + 1 par section/annexe sélectionnée + vérifier éligibilité + relecture
  const totalTaches = totalDocs + 4;

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
        Aperçu du projet à créer
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 20 }}>
        Décochez les éléments que vous ne souhaitez pas créer. Le projet sera initialisé avec {totalDocs} documents et {totalTaches} tâches.
      </p>

      {/* Résumé */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Bailleur</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>{analysis.donor.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{analysis.donor.program ?? analysis.donor.referenceNumber ?? ""}</div>
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Budget</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
            {analysis.budget.maxAmount ? `${analysis.budget.maxAmount.toLocaleString("fr-FR")} ${analysis.budget.currency}` : "Non spécifié"}
          </div>
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Deadline</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>
            {new Date(analysis.timeline.submissionDeadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Sections du document ({selectedSections.size}/{analysis.requiredSections.length})
          </span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", fontSize: 11 }}
            onClick={() => setSelectedSections(new Set(analysis.requiredSections.map(s => s.id)))}>
            Tout sélectionner
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {analysis.requiredSections.map(s => {
            const checked = selectedSections.has(s.id);
            return (
              <label key={s.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                background: checked ? "var(--primary-soft)" : "var(--surface)",
                borderRadius: 8, cursor: "pointer",
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggleSection(s.id)} style={{ accentColor: "var(--primary)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{s.title}</div>
                  {s.weight && <span style={{ fontSize: 11, color: "var(--text-3)" }}>{s.weight}% de la note</span>}
                </div>
                {checked && <Icons.Check size={14} style={{ color: "var(--primary)" }} />}
              </label>
            );
          })}
        </div>
      </div>

      {/* Annexes */}
      {analysis.requiredAnnexes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            Annexes ({selectedAnnexes.size}/{analysis.requiredAnnexes.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {analysis.requiredAnnexes.map(a => {
              const checked = selectedAnnexes.has(a.id);
              return (
                <label key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                  background: checked ? "var(--primary-soft)" : "var(--surface)",
                  borderRadius: 8, cursor: "pointer",
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleAnnex(a.id)} style={{ accentColor: "var(--primary)" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{a.title}</span>
                  {checked && <Icons.Check size={14} style={{ color: "var(--primary)" }} />}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton créer */}
      <button className="btn btn-primary" onClick={() => onConfirm([...selectedSections], [...selectedAnnexes])}
        disabled={creating || totalDocs === 0}
        style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14, opacity: creating ? 0.5 : 1 }}>
        {creating ? (
          <><Icons.Sparkles size={16} /> Création du projet en cours...</>
        ) : (
          <><Icons.Check size={16} /> Créer le projet ({totalDocs} documents · {totalTaches} tâches)</>
        )}
      </button>
    </div>
  );
}
