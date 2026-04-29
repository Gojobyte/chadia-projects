"use client";

import { useState } from "react";
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
  { id: "A_FAIRE", label: "A faire", color: "bg-slate-600", lightColor: "bg-slate-50", borderColor: "border-slate-300", emoji: "📋" },
  { id: "EN_COURS", label: "En cours", color: "bg-blue-600", lightColor: "bg-blue-50", borderColor: "border-blue-200", emoji: "✏️" },
  { id: "EN_REVISION", label: "En revision", color: "bg-amber-500", lightColor: "bg-amber-50", borderColor: "border-amber-200", emoji: "👀" },
  { id: "VALIDE", label: "Valide", color: "bg-green-600", lightColor: "bg-green-50", borderColor: "border-green-200", emoji: "✅" },
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
    // Verifier si on drop sur une colonne
    const targetColumn = columns.find(c => c.id === overId);
    // Ou sur une carte (prendre le statut de la carte)
    const targetCard = items.find(d => d.id === overId);
    const newStatut = targetColumn?.id ?? targetCard?.statut;

    if (!newStatut) return;

    const draggedDoc = items.find(d => d.id === active.id);
    if (!draggedDoc || draggedDoc.statut === newStatut) return;

    // Mettre a jour localement
    setItems(prev => prev.map(d => d.id === active.id ? { ...d, statut: newStatut } : d));
    // Sauvegarder via l'API
    onMoveDocument(draggedDoc.id, newStatut);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-3 h-full">
        {columns.map(col => {
          const colItems = items.filter(d => d.statut === col.id);
          return <DroppableColumn key={col.id} column={col} items={colItems} projetId={projetId} />;
        })}
      </div>

      <DragOverlay>
        {activeCard && <CardOverlay doc={activeCard} />}
      </DragOverlay>
    </DndContext>
  );
}

// Colonne droppable
function DroppableColumn({ column, items, projetId }: {
  column: typeof columns[0]; items: Document[]; projetId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-h-[500px]">
      {/* Header */}
      <div className={`${column.color} rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{column.emoji}</span>
          <h3 className="text-sm font-bold text-white">{column.label}</h3>
        </div>
        <span className="bg-white/25 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
          {items.length}
        </span>
      </div>

      {/* Zone de drop */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-b-xl p-2 space-y-2 transition-colors ${column.lightColor} border ${column.borderColor} ${
          isOver ? "ring-2 ring-blue-400 bg-blue-100" : ""
        }`}
      >
        {items.map(doc => (
          <DraggableCard key={doc.id} doc={doc} projetId={projetId} />
        ))}
        {items.length === 0 && (
          <div className={`flex items-center justify-center h-32 rounded-lg border-2 border-dashed ${
            isOver ? "border-blue-400 bg-blue-50" : "border-slate-200"
          }`}>
            <p className="text-xs text-slate-400 italic">Glissez ici</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Carte draggable
function DraggableCard({ doc, projetId }: { doc: Document; projetId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: doc.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  const hasGDoc = doc.fichierUrl?.includes("docs.google.com");

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all">
      {/* Categorie tag */}
      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-2">
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </span>

      {/* Titre */}
      <Link href={`/projets/${projetId}/docs/${doc.id}`}
        className="block text-sm font-semibold text-slate-900 hover:text-blue-600 mb-2 leading-snug">
        {doc.titre}
      </Link>

      {/* Footer carte */}
      <div className="flex items-center justify-between mt-2">
        {doc.assigneA ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white">
              {doc.assigneA.name.charAt(0)}
            </div>
            <span className="text-xs text-slate-500">{doc.assigneA.name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-300">Non assigne</span>
        )}
        <div className="flex items-center gap-1">
          {hasGDoc && <span className="text-sm" title="Google Doc lie">📄</span>}
          <Link href={`/projets/${projetId}/docs/${doc.id}`}
            className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
            Ouvrir
          </Link>
        </div>
      </div>
    </div>
  );
}

// Overlay pendant le drag
function CardOverlay({ doc }: { doc: Document }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-2xl border-2 border-blue-400 cursor-grabbing w-full max-w-[300px] rotate-2 scale-105">
      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 mb-2">
        {categorieLabels[doc.categorie] ?? doc.categorie}
      </span>
      <p className="text-sm font-semibold text-slate-900">{doc.titre}</p>
    </div>
  );
}
