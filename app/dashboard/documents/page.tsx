"use client";

import { useState } from "react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { ProjectCalendar } from "@/components/calendar/ProjectCalendar";
import { ProjectTimeline, GanttTask } from "@/components/timeline/ProjectTimeline";

type Tab = "editor" | "timeline" | "calendar";

const sampleTasks: GanttTask[] = [
  {
    id: "1",
    name: "Analyse du cahier des charges",
    startDate: new Date(2026, 4, 1),
    endDate: new Date(2026, 4, 7),
    progress: 100,
    color: "#3b82f6",
    category: "Analyse",
  },
  {
    id: "2",
    name: "Rédaction technique",
    startDate: new Date(2026, 4, 5),
    endDate: new Date(2026, 4, 18),
    progress: 65,
    color: "#8b5cf6",
    category: "Rédaction",
  },
  {
    id: "3",
    name: "Budget et chiffrage",
    startDate: new Date(2026, 4, 12),
    endDate: new Date(2026, 4, 20),
    progress: 30,
    color: "#f59e0b",
    category: "Budget",
  },
  {
    id: "4",
    name: "Relecture et validation",
    startDate: new Date(2026, 4, 18),
    endDate: new Date(2026, 4, 24),
    progress: 0,
    color: "#10b981",
    category: "Validation",
  },
  {
    id: "5",
    name: "Soumission finale",
    startDate: new Date(2026, 4, 24),
    endDate: new Date(2026, 4, 26),
    progress: 0,
    color: "#ef4444",
    category: "Soumission",
  },
];

const sampleEvents = [
  { id: "1", title: "Deadline analyse", date: new Date(2026, 4, 7), color: "bg-blue-100 text-blue-700" },
  { id: "2", title: "Réunion équipe", date: new Date(2026, 4, 10), color: "bg-purple-100 text-purple-700" },
  { id: "3", title: "Soumission", date: new Date(2026, 4, 26), color: "bg-red-100 text-red-700" },
];

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [editorContent, setEditorContent] = useState("<h1>Réponse à l'appel d'offres</h1><p>Commencez à rédiger votre proposition ici...</p>");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "editor", label: "Éditeur", icon: "📝" },
    { id: "timeline", label: "Timeline", icon: "📊" },
    { id: "calendar", label: "Calendrier", icon: "📅" },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Documents & Planification</h1>
        <p className="text-muted-foreground text-sm">
          Rédigez, planifiez et suivez vos réponses aux appels d&apos;offres
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "editor" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Éditeur de document</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors">
                  💾 Sauvegarder
                </button>
                <button className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  📤 Exporter PDF
                </button>
              </div>
            </div>
            <BlockEditor
              content={editorContent}
              onChange={setEditorContent}
              placeholder="Commencez à rédiger votre réponse à l'appel d'offres..."
            />
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Timeline du projet</h2>
              <button className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors">
                + Ajouter une tâche
              </button>
            </div>
            <ProjectTimeline
              tasks={sampleTasks}
              onTaskClick={(task) => console.log("Task clicked:", task.name)}
            />
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Calendrier</h2>
              <button className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors">
                + Ajouter un événement
              </button>
            </div>
            <ProjectCalendar
              events={sampleEvents}
              onDateClick={(date) => console.log("Date clicked:", date)}
              onEventClick={(event) => console.log("Event clicked:", event.title)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
