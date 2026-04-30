"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface Document {
  id: string; categorie: string; titre: string; statut: string;
  fichierUrl: string | null; progression?: number;
  dateLimite?: string | null;
  assigneA: { id: string; name: string } | null;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface KanbanBoardProps {
  projetId: string;
  documents: Document[];
  onMoveDocument: (documentId: string, newStatut: string) => void;
}

const columns = [
  { id: "BROUILLON", label: "Brouillon", color: "var(--st-brouillon)" },
  { id: "REDACTION", label: "Redaction", color: "var(--st-redaction)" },
  { id: "RELECTURE", label: "Relecture", color: "var(--st-relecture)" },
  { id: "VALIDATION", label: "Validation", color: "var(--st-validation)" },
  { id: "FINALISATION", label: "Finalisation", color: "var(--st-finalisation)" },
  { id: "VALIDE", label: "Valide", color: "var(--st-soumis)" },
];

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget previsionnel",
  BUDGET_DETAIL: "Budget detaille", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV equipe", DOCUMENT_LEGAL: "Documents legaux", AUTRE: "Autre",
};

export function KanbanBoard({ projetId, documents, onMoveDocument }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Document | null>(null);
  const [items, setItems] = useState(documents);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(d => setUsers(d.users ?? []));
  }, []);

  async function assignDocument(documentId: string, userId: string | null) {
    await fetch(`/api/projets/${projetId}/documents`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, assigneAId: userId }),
    });
    const user = users.find(u => u.id === userId);
    setItems(prev => prev.map(d =>
      d.id === documentId ? { ...d, assigneA: userId && user ? { id: userId, name: user.name } : null } : d
    ));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const doc = items.find(d => d.id === event.active.id);
    if (doc) setActiveCard(doc);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const overId = over.id as string;
    const targetColumn = columns.find(c => c.id === overId);
    const targetCard = items.find(d => d.id === overId);
    const newStatut = targetColumn?.id ?? targetCard?.statut;

    if (!newStatut) return;

    const draggedDoc = items.find(d => d.id === active.id);
    if (!draggedDoc || draggedDoc.statut === newStatut) return;

    setItems(prev => prev.map(d => d.id === active.id ? { ...d, statut: newStatut } : d));
    onMoveDocument(draggedDoc.id, newStatut);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(200px, 1fr))", gap: 10 }}>
        {columns.map(col => {
          const colItems = items.filter(d => d.statut === col.id);
          return <DroppableColumn key={col.id} column={col} items={colItems} projetId={projetId} users={users} onAssign={assignDocument} />;
        })}
      </div>

      <DragOverlay>
        {activeCard && <CardOverlay doc={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ column, items, projetId, users, onAssign }: {
  column: typeof columns[0]; items: Document[]; projetId: string;
  users: User[]; onAssign: (docId: string, userId: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Header avec carre colore — comme dans le design */}
      <div className="row" style={{ padding: "8px 10px", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: column.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{column.label}</span>
        <span className="tag" style={{ marginLeft: "auto" }}>{items.length}</span>
      </div>

      {/* Zone de drop */}
      <div
        ref={setNodeRef}
        style={{
          display: "flex", flexDirection: "column", gap: 8, minHeight: 200,
          borderRadius: 8,
          ...(isOver ? { outline: "2px solid var(--primary)", outlineOffset: -2, background: "var(--primary-soft)" } : {}),
        }}
      >
        {items.map(doc => (
          <DraggableCard key={doc.id} doc={doc} projetId={projetId} users={users} onAssign={onAssign} />
        ))}
        {items.length === 0 && (
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
}

function DraggableCard({ doc, projetId, users, onAssign }: {
  doc: Document; projetId: string; users: User[];
  onAssign: (docId: string, userId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const [showAssign, setShowAssign] = useState(false);
  const prog = doc.progression ?? 0;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className="card" style={{ ...style, padding: 12, cursor: "grab", borderRadius: 8 }}>

      {/* Categorie en uppercase */}
      <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em", marginBottom: 6 }}>
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </div>

      {/* Titre */}
      <Link href={`/projets/${projetId}/docs/${doc.id}`}
        style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35, marginBottom: 10, textDecoration: "none" }}
        onPointerDown={e => e.stopPropagation()}>
        {doc.titre}
      </Link>

      {/* Progress bar */}
      {prog > 0 && prog < 100 && (
        <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${prog}%`, height: "100%", background: "var(--primary)", borderRadius: 2 }} />
        </div>
      )}

      {/* Footer: avatar, deadline, comments */}
      <div className="row" style={{ marginTop: 10, gap: 6 }}>
        <div onPointerDown={e => e.stopPropagation()} style={{ position: "relative" }}>
          <button onClick={() => setShowAssign(!showAssign)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {doc.assigneA ? (
              <div className="avatar" style={{ width: 20, height: 20, fontSize: 9, background: "var(--primary)" }}>
                {doc.assigneA.name.charAt(0)}
              </div>
            ) : (
              <span style={{ width: 20, height: 20, borderRadius: 50, border: "1px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)", fontSize: 11 }}>?</span>
            )}
          </button>

          {showAssign && (
            <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow-lg)", zIndex: 50, width: 180, padding: "4px 0" }}>
              <p style={{ fontSize: 10, color: "var(--text-4)", padding: "6px 12px", textTransform: "uppercase", fontWeight: 600 }}>Assigner a</p>
              {doc.assigneA && (
                <button onClick={() => { onAssign(doc.id, null); setShowAssign(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "6px 12px", fontSize: 12, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}>
                  Retirer
                </button>
              )}
              {users.map(u => (
                <button key={u.id} onClick={() => { onAssign(doc.id, u.id); setShowAssign(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "6px 12px", fontSize: 12, color: "var(--text)", background: doc.assigneA?.id === u.id ? "var(--primary-soft)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <div className="avatar" style={{ width: 18, height: 18, fontSize: 8, background: "var(--primary)" }}>{u.name.charAt(0)}</div>
                  {u.name}
                </button>
              ))}
              {users.length === 0 && <p style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-4)" }}>Aucun utilisateur</p>}
            </div>
          )}
        </div>

        {doc.dateLimite && (
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>
            {new Date(doc.dateLimite).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}

function CardOverlay({ doc }: { doc: Document }) {
  return (
    <div className="card" style={{ padding: 12, cursor: "grabbing", borderRadius: 8, boxShadow: "var(--shadow-lg)", transform: "rotate(2deg) scale(1.05)", maxWidth: 280 }}>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em", marginBottom: 6 }}>
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{doc.titre}</div>
    </div>
  );
}
