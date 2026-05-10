"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Document {
  id: string; categorie: string; titre: string; statut: string;
  fichierUrl: string | null; progression?: number;
  dateLimite?: string | null;
  assigneA: { id: string; name: string } | null;
  _count?: { commentaires?: number };
}

interface User { id: string; name: string; email: string; }

interface KanbanBoardProps {
  projetId: string;
  documents: Document[];
  onMoveDocument: (documentId: string, newStatut: string) => void;
}

const columns = [
  { id: "BROUILLON", label: "Brouillon", color: "var(--st-brouillon)" },
  { id: "REDACTION", label: "Rédaction", color: "var(--st-redaction)" },
  { id: "RELECTURE", label: "Relecture", color: "var(--st-relecture)" },
  { id: "VALIDATION", label: "Validation", color: "var(--st-validation)" },
  { id: "FINALISATION", label: "Finalisation", color: "var(--st-finalisation)" },
  { id: "VALIDE", label: "Validé", color: "var(--st-soumis)" },
];

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget prévisionnel",
  BUDGET_DETAIL: "Détail budgétaire", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV équipe", DOCUMENT_LEGAL: "Documents légaux", AUTRE: "Autre",
};

const avatarColors = [
  "oklch(0.6 0.15 165)", "oklch(0.6 0.16 290)", "oklch(0.65 0.15 75)",
  "oklch(0.6 0.13 245)", "oklch(0.62 0.13 25)", "oklch(0.55 0.1 200)",
];

export function KanbanBoard({ projetId, documents, onMoveDocument }: KanbanBoardProps) {
  const [items, setItems] = useState(documents);
  const [users, setUsers] = useState<User[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, []);

  async function assignDocument(documentId: string, userId: string | null) {
    await fetch(`/api/projets/${projetId}/documents`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, assigneAId: userId }),
    });
    const user = users.find(u => u.id === userId);
    setItems(prev => prev.map(d =>
      d.id === documentId ? { ...d, assigneA: userId && user ? { id: userId, name: user.name } : null } : d
    ));
  }

  function handleDragStart(e: React.DragEvent, docId: string) {
    setDragId(docId);
    e.dataTransfer.effectAllowed = "move";
    // Rendre le ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragId(null);
    setOverCol(null);
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverCol(colId);
  }

  function handleDragLeave() {
    setOverCol(null);
  }

  function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setOverCol(null);
    if (!dragId) return;
    const doc = items.find(d => d.id === dragId);
    if (!doc || doc.statut === colId) return;
    setItems(prev => prev.map(d => d.id === dragId ? { ...d, statut: colId } : d));
    onMoveDocument(dragId, colId);
    setDragId(null);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(200px, 1fr))", gap: 10 }}>
      {columns.map(col => {
        const colItems = items.filter(d => d.statut === col.id);
        const isOver = overCol === col.id;
        return (
          <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Column header */}
            <div className="row" style={{ padding: "8px 10px", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{col.label}</span>
              <span className="tag" style={{ marginLeft: "auto" }}>{colItems.length}</span>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                display: "flex", flexDirection: "column", gap: 8, minHeight: 200,
                borderRadius: 8, padding: 4, transition: "all 0.15s",
                ...(isOver ? { outline: "2px solid var(--primary)", outlineOffset: -2, background: "var(--primary-soft)" } : {}),
              }}
            >
              {colItems.map(doc => (
                <KanbanCard
                  key={doc.id} doc={doc} projetId={projetId}
                  users={users} onAssign={assignDocument}
                  onDragStart={e => handleDragStart(e, doc.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {colItems.length === 0 && (
                <div style={{
                  border: "1px dashed var(--border-strong)", borderRadius: 8,
                  padding: 24, textAlign: "center", fontSize: 11, color: "var(--text-4)",
                }}>
                  Glisser ici
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ doc, projetId, users, onAssign, onDragStart, onDragEnd }: {
  doc: Document; projetId: string; users: User[];
  onAssign: (docId: string, userId: string | null) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const prog = doc.progression ?? 0;
  const comments = doc._count?.commentaires ?? 0;
  const initials = doc.assigneA?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, padding: 12, cursor: "grab",
      }}
    >
      {/* Catégorie uppercase */}
      <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em", marginBottom: 6 }}>
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </div>

      {/* Titre */}
      <Link href={`/projets/${projetId}/docs/${doc.id}`}
        style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35, marginBottom: 10, textDecoration: "none" }}
        onDragStart={e => e.stopPropagation()}>
        {doc.titre}
      </Link>

      {/* Progress bar */}
      {prog > 0 && prog < 100 && (
        <div className="progress" style={{ marginBottom: 10 }}>
          <span style={{ width: `${prog}%` }} />
        </div>
      )}

      {/* Footer: avatar + date + comments */}
      <div className="row" style={{ marginTop: 10, gap: 6 }}>
        {/* Avatar / Assign */}
        <div style={{ position: "relative" }}>
          <button onClick={e => { e.stopPropagation(); setShowAssign(!showAssign); }}
            onDragStart={e => e.stopPropagation()}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {doc.assigneA ? (
              <span className="avatar" style={{ width: 20, height: 20, fontSize: 8, background: avatarColors[0] }}>
                {initials}
              </span>
            ) : (
              <span style={{ width: 20, height: 20, borderRadius: 50, border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)", fontSize: 11 }}>?</span>
            )}
          </button>

          {showAssign && (
            <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, width: 180, padding: "4px 0" }}>
              <p style={{ fontSize: 10, color: "var(--text-4)", padding: "6px 12px", textTransform: "uppercase", fontWeight: 600 }}>Assigner à</p>
              {doc.assigneA && (
                <button onClick={() => { onAssign(doc.id, null); setShowAssign(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "6px 12px", fontSize: 12, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}>
                  Retirer
                </button>
              )}
              {users.map(u => (
                <button key={u.id} onClick={() => { onAssign(doc.id, u.id); setShowAssign(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "6px 12px", fontSize: 12, color: "var(--text)", background: doc.assigneA?.id === u.id ? "var(--primary-soft)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="avatar" style={{ width: 18, height: 18, fontSize: 8, background: avatarColors[users.indexOf(u) % avatarColors.length] }}>{u.name.charAt(0)}</span>
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        {doc.dateLimite && (
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            {new Date(doc.dateLimite).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </span>
        )}

        {/* Comments count */}
        {comments > 0 && (
          <span className="row" style={{ marginLeft: "auto", gap: 3, fontSize: 11, color: "var(--text-3)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
            </svg>
            {comments}
          </span>
        )}
      </div>
    </div>
  );
}
