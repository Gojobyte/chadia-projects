"use client";

import { useState, useEffect, useCallback } from "react";
import { Icons } from "@/components/icons";

interface KeyQuestion {
  index: number;
  questionText: string;
  answer: string | null;
  targetSectionId: string | null;
  answeredAt: string | null;
  answeredBy: string | null;
}

interface StrategicChecklistProps {
  projetId: string;
  sections?: Array<{ id: string; title: string }>;
}

export function StrategicChecklist({ projetId, sections = [] }: StrategicChecklistProps) {
  const [questions, setQuestions] = useState<KeyQuestion[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projets/${projetId}/key-questions`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setProgress(data.progress ?? 0);
    }
    setLoading(false);
  }, [projetId]);

  useEffect(() => { load(); }, [load]);

  async function saveAnswer(index: number, answer: string, targetSectionId?: string) {
    setSavingIndex(index);
    const res = await fetch(`/api/projets/${projetId}/key-questions/${index}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: answer || null, targetSectionId }),
    });
    if (res.ok) {
      setQuestions(prev => prev.map(q =>
        q.index === index ? { ...q, answer, targetSectionId: targetSectionId ?? q.targetSectionId, answeredAt: new Date().toISOString() } : q
      ));
      setProgress(prev => {
        const answered = questions.filter((q, i) => i === index ? !!answer : !!q.answer).length;
        return questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
      });
    }
    setSavingIndex(null);
    setEditingIndex(null);
  }

  if (loading) return null;
  if (questions.length === 0) return null;

  const answeredCount = questions.filter(q => q.answer).length;

  return (
    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
      {/* Header — cliquable pour déplier */}
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10,
        background: "none", border: "none", cursor: "pointer", textAlign: "left",
      }}>
        <Icons.Sparkles size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
            Questions stratégiques
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
            {answeredCount}/{questions.length} répondues — ces réponses guident la rédaction IA de vos sections
          </div>
        </div>
        {/* Barre de progression */}
        <div style={{ width: 100, display: "flex", alignItems: "center", gap: 6 }}>
          <div className="progress" style={{ flex: 1 }}>
            <span style={{ width: `${progress}%`, background: progress === 100 ? "var(--success)" : "var(--primary)" }} />
          </div>
          <span className="tnum" style={{ fontSize: 11, color: "var(--text-3)", minWidth: 28 }}>{progress}%</span>
        </div>
        <Icons.ChevronDown size={14} style={{
          color: "var(--text-3)", transition: "transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "rotate(0)",
        }} />
      </button>

      {/* Corps — questions */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {questions.map((q, i) => (
            <QuestionItem
              key={q.index}
              question={q}
              sections={sections}
              isEditing={editingIndex === i}
              isSaving={savingIndex === i}
              onEdit={() => setEditingIndex(editingIndex === i ? null : i)}
              onSave={(answer, sectionId) => saveAnswer(q.index, answer, sectionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionItem({ question, sections, isEditing, isSaving, onEdit, onSave }: {
  question: KeyQuestion;
  sections: Array<{ id: string; title: string }>;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: (answer: string, sectionId?: string) => void;
}) {
  const [draft, setDraft] = useState(question.answer ?? "");
  const [sectionId, setSectionId] = useState(question.targetSectionId ?? "");
  const hasAnswer = !!question.answer;

  return (
    <div style={{
      padding: "12px 18px", borderBottom: "1px solid var(--border)",
      background: hasAnswer ? "var(--success-soft)" : "transparent",
    }}>
      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
        {/* Checkbox visuelle */}
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
          border: `2px solid ${hasAnswer ? "var(--success)" : "var(--border-strong)"}`,
          background: hasAnswer ? "var(--success)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {hasAnswer && <Icons.Check size={12} style={{ color: "white" }} />}
        </div>

        <div style={{ flex: 1 }}>
          {/* Question */}
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, marginBottom: 4 }}>
            {question.questionText}
          </div>

          {/* Réponse existante ou mode édition */}
          {isEditing ? (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Votre réponse..."
                autoFocus
                rows={3}
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid var(--border-strong)",
                  borderRadius: 6, fontSize: 13, lineHeight: 1.5, color: "var(--text)",
                  background: "var(--surface)", resize: "vertical", outline: "none",
                }}
              />
              {sections.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 3 }}>
                    Section ciblée (optionnel)
                  </label>
                  <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                    style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12, background: "var(--surface)", color: "var(--text)" }}>
                    <option value="">Aucune section</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              )}
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <button onClick={() => onSave(draft, sectionId || undefined)} disabled={isSaving}
                  className="btn btn-primary btn-sm" style={{ fontSize: 12, opacity: isSaving ? 0.5 : 1 }}>
                  {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                </button>
                <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Annuler</button>
              </div>
            </div>
          ) : hasAnswer ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {question.answer}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                {question.targetSectionId && (
                  <span className="tag" style={{ fontSize: 10, background: "var(--primary-soft)", color: "var(--primary)", borderColor: "transparent" }}>
                    → {sections.find(s => s.id === question.targetSectionId)?.title ?? question.targetSectionId}
                  </span>
                )}
                <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginLeft: "auto" }}>Modifier</button>
              </div>
            </div>
          ) : (
            <button onClick={onEdit} style={{
              marginTop: 4, padding: "6px 12px", border: "1px dashed var(--border-strong)",
              borderRadius: 6, background: "none", color: "var(--text-3)", fontSize: 12,
              cursor: "pointer", width: "100%", textAlign: "left",
            }}>
              Cliquez pour répondre...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
