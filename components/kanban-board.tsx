"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

// --------------------------------------------------------------------------
// Kanban Board — Style Trello avec drag & drop
// --------------------------------------------------------------------------

interface Document {
  id: string; categorie: string; titre: string; statut: string;
  fichierUrl: string | null;
  assigneA: { id: string; name: string } | null;
}

interface KanbanBoardProps {
  projetId: string;
  documents: Document[];
  onMoveDocument: (documentId: string, newStatut: string) => void;
}

const columns = [
  { id: "A_FAIRE", label: "A faire", color: "bg-slate-500", lightColor: "bg-slate-50", emoji: "📋" },
  { id: "EN_COURS", label: "En cours", color: "bg-blue-500", lightColor: "bg-blue-50", emoji: "✏️" },
  { id: "EN_REVISION", label: "En revision", color: "bg-amber-500", lightColor: "bg-amber-50", emoji: "👀" },
  { id: "VALIDE", label: "Valide", color: "bg-green-500", lightColor: "bg-green-50", emoji: "✅" },
];

const categorieLabels: Record<string, string> = {
  PROPOSITION_TECHNIQUE: "Proposition technique", BUDGET_PREVISIONNEL: "Budget",
  BUDGET_DETAIL: "Budget detail", CADRE_LOGIQUE: "Cadre logique",
  NOTE_CONCEPTUELLE: "Note conceptuelle", PLAN_TRAVAIL: "Plan de travail",
  GANTT: "Gantt", CV: "CV", DOCUMENT_LEGAL: "Docs legaux", AUTRE: "Autre",
};

export function KanbanBoard({ projetId, documents, onMoveDocument }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Document | null>(null);
  const [items, setItems] = useState(documents);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const doc = items.find(d => d.id === event.active.id);
    if (doc) setActiveCard(doc);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeDoc = items.find(d => d.id === active.id);
    if (!activeDoc) return;

    // Determiner la colonne de destination
    const overColumnId = columns.find(c => c.id === over.id)?.id;
    const overDoc = items.find(d => d.id === over.id);
    const targetColumn = overColumnId ?? overDoc?.statut;

    if (targetColumn && targetColumn !== activeDoc.statut) {
      setItems(prev => prev.map(d => d.id === active.id ? { ...d, statut: targetColumn } : d));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    setActiveCard(null);

    const doc = items.find(d => d.id === active.id);
    const originalDoc = documents.find(d => d.id === active.id);
    if (doc && originalDoc && doc.statut !== originalDoc.statut) {
      onMoveDocument(doc.id, doc.statut);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colItems = items.filter(d => d.statut === col.id);
          return (
            <KanbanColumn key={col.id} column={col} items={colItems} projetId={projetId} />
          );
        })}
      </div>

      <DragOverlay>
        {activeCard && <KanbanCardOverlay doc={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}

// Colonne Kanban
function KanbanColumn({ column, items, projetId }: {
  column: typeof columns[0]; items: Document[]; projetId: string;
}) {
  return (
    <div className="w-72 flex-shrink-0">
      {/* Header colonne */}
      <div className={`${column.color} rounded-t-lg px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span>{column.emoji}</span>
          <h3 className="text-sm font-semibold text-white">{column.label}</h3>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
      </div>

      {/* Corps colonne */}
      <SortableContext items={items.map(d => d.id)} strategy={verticalListSortingStrategy} id={column.id}>
        <div className={`${column.lightColor} rounded-b-lg p-2 space-y-2 min-h-[250px]`} id={column.id}>
          {items.map(doc => (
            <KanbanCard key={doc.id} doc={doc} projetId={projetId} />
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400 italic">
              Glissez un document ici
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Carte Kanban (draggable)
function KanbanCard({ doc, projetId }: { doc: Document; projetId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const hasGDoc = doc.fichierUrl?.includes("docs.google.com");

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-1">
        <Link href={`/projets/${projetId}/docs/${doc.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 flex-1">
          {doc.titre}
        </Link>
        {hasGDoc && <span className="text-xs" title="Google Doc lie">📄</span>}
      </div>
      <p className="text-xs text-slate-400">{categorieLabels[doc.categorie] ?? doc.categorie}</p>
      {doc.assigneA && (
        <div className="mt-2 flex items-center gap-1">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
            {doc.assigneA.name.charAt(0)}
          </div>
          <span className="text-xs text-slate-500">{doc.assigneA.name}</span>
        </div>
      )}
    </div>
  );
}

// Carte en cours de drag (overlay)
function KanbanCardOverlay({ doc }: { doc: Document }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-xl border-2 border-blue-400 cursor-grabbing w-72 rotate-3">
      <p className="text-sm font-medium text-slate-900">{doc.titre}</p>
      <p className="text-xs text-slate-400">{categorieLabels[doc.categorie] ?? doc.categorie}</p>
    </div>
  );
}
