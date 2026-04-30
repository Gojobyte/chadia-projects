"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";

interface Document {
  id: string; categorie: string; titre: string; statut: string;
  fichierUrl: string | null; progression?: number;
  dateLimite?: string | null;
  assigneA: { id: string; name: string } | null;
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
  BUDGET_DETAIL: "Budget détaillé", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Diagramme de Gantt", CV: "CV équipe", DOCUMENT_LEGAL: "Documents légaux", AUTRE: "Autre",
};

export function KanbanBoard({ projetId, documents, onMoveDocument }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Document | null>(null);
  const [activeWidth, setActiveWidth] = useState(0);
  const [items, setItems] = useState(documents);
  const [users, setUsers] = useState<User[]>([]);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Un seul sensor: PointerSensor avec distance minimale de 8px pour eviter les faux drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const doc = items.find(d => d.id === event.active.id);
    if (doc) {
      setActiveCard(doc);
      // Capturer la largeur de la carte pour le DragOverlay
      const el = cardRefs.current[doc.id];
      if (el) setActiveWidth(el.offsetWidth);
    }
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
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(200px, 1fr))", gap: 10 }}>
        {columns.map(col => {
          const colItems = items.filter(d => d.statut === col.id);
          return (
            <DroppableColumn key={col.id} column={col} items={colItems} projetId={projetId}
              users={users} onAssign={assignDocument} cardRefs={cardRefs} />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard && <CardOverlay doc={activeCard} width={activeWidth} />}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ column, items, projetId, users, onAssign, cardRefs }: {
  column: typeof columns[0]; items: Document[]; projetId: string;
  users: User[]; onAssign: (docId: string, userId: string | null) => void;
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row" style={{ padding: "8px 10px", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: column.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{column.label}</span>
        <span className="tag" style={{ marginLeft: "auto" }}>{items.length}</span>
      </div>

      <div
        ref={setNodeRef}
        style={{
          display: "flex", flexDirection: "column", gap: 8, minHeight: 200,
          borderRadius: 8, padding: 4, transition: "background 0.15s, outline 0.15s",
          ...(isOver ? { outline: "2px solid var(--primary)", outlineOffset: -2, background: "var(--primary-soft)" } : {}),
        }}
      >
        {items.map(doc => (
          <DraggableCard key={doc.id} doc={doc} projetId={projetId} users={users}
            onAssign={onAssign} cardRefs={cardRefs} />
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

function DraggableCard({ doc, projetId, users, onAssign, cardRefs }: {
  doc: Document; projetId: string; users: User[];
  onAssign: (docId: string, userId: string | null) => void;
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: doc.id });
  const [showAssign, setShowAssign] = useState(false);
  const prog = doc.progression ?? 0;

  // Stocker la ref pour mesurer la largeur
  const setRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    cardRefs.current[doc.id] = el;
  };

  return (
    <div ref={setRef} {...attributes} {...listeners}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 8, padding: 12,
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.25 : 1,
        transition: "opacity 0.15s",
        // Pas de transform ici — le DragOverlay gere le visuel du drag
      }}>

      <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em", marginBottom: 6 }}>
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </div>

      <Link href={`/projets/${projetId}/docs/${doc.id}`}
        style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35, marginBottom: 10, textDecoration: "none" }}
        onPointerDown={e => e.stopPropagation()}>
        {doc.titre}
      </Link>

      {prog > 0 && prog < 100 && (
        <div className="progress" style={{ marginBottom: 10 }}>
          <span style={{ width: `${prog}%` }} />
        </div>
      )}

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

function CardOverlay({ doc, width }: { doc: Document; width: number }) {
  const prog = doc.progression ?? 0;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 12,
      cursor: "grabbing",
      boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
      width: width > 0 ? width : "auto",
      transform: "rotate(2deg) scale(1.02)",
    }}>
      <div style={{ fontSize: 10.5, color: "var(--text-3)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em", marginBottom: 6 }}>
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35, marginBottom: 8 }}>{doc.titre}</div>
      {prog > 0 && prog < 100 && (
        <div className="progress"><span style={{ width: `${prog}%` }} /></div>
      )}
    </div>
  );
}
