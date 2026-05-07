"use client";

import { useState, useCallback } from "react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { Spreadsheet, CellData } from "@/components/spreadsheet/Spreadsheet";
import { cn } from "@/lib/utils";

type EditorTab = "document" | "spreadsheet";

const SAMPLE_BUDGET: Record<string, CellData> = {
  "A1": { value: "Budget previsionnel", style: { bold: true, fontSize: 14, bgColor: "#dbeafe", align: "center" } },
  "A3": { value: "Categorie", style: { bold: true, bgColor: "#e5e7eb" } },
  "B3": { value: "Description", style: { bold: true, bgColor: "#e5e7eb" } },
  "C3": { value: "Quantite", style: { bold: true, bgColor: "#e5e7eb" } },
  "D3": { value: "Prix unitaire", style: { bold: true, bgColor: "#e5e7eb" } },
  "E3": { value: "Total", style: { bold: true, bgColor: "#e5e7eb" } },
  "A4": { value: "RH", style: { bold: true } },
  "B4": { value: "Chef de projet (6 mois)", style: {} },
  "C4": { value: "6", style: { format: "number", align: "right" } },
  "D4": { value: "800000", style: { format: "currency", align: "right" } },
  "E4": { value: "=C4*D4", style: { format: "currency", align: "right" } },
  "A5": { value: "", style: {} },
  "B5": { value: "Consultant technique (4 mois)", style: {} },
  "C5": { value: "4", style: { format: "number", align: "right" } },
  "D5": { value: "600000", style: { format: "currency", align: "right" } },
  "E5": { value: "=C5*D5", style: { format: "currency", align: "right" } },
  "A6": { value: "", style: {} },
  "B6": { value: "Assistant administratif (6 mois)", style: {} },
  "C6": { value: "6", style: { format: "number", align: "right" } },
  "D6": { value: "300000", style: { format: "currency", align: "right" } },
  "E6": { value: "=C6*D6", style: { format: "currency", align: "right" } },
  "A8": { value: "Equipements", style: { bold: true } },
  "B8": { value: "Ordinateurs portables", style: {} },
  "C8": { value: "5", style: { format: "number", align: "right" } },
  "D8": { value: "750000", style: { format: "currency", align: "right" } },
  "E8": { value: "=C8*D8", style: { format: "currency", align: "right" } },
  "A9": { value: "", style: {} },
  "B9": { value: "Serveur local", style: {} },
  "C9": { value: "1", style: { format: "number", align: "right" } },
  "D9": { value: "2500000", style: { format: "currency", align: "right" } },
  "E9": { value: "=C9*D9", style: { format: "currency", align: "right" } },
  "A11": { value: "TOTAL", style: { bold: true, bgColor: "#fef3c7" } },
  "E11": { value: "=SOMME(E4:E9)", style: { bold: true, format: "currency", align: "right", bgColor: "#fef3c7" } },
};

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<EditorTab>("document");
  const [docContent, setDocContent] = useState("<h1>Reponse a l'appel d'offres</h1><p>Commencez a rediger votre proposition ici...</p>");
  const [docTitle, setDocTitle] = useState("Appel d'offres - Projet Education");
  const [spreadData, setSpreadData] = useState<Record<string, CellData>>(SAMPLE_BUDGET);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback((html: string) => {
    setIsSaving(true);
    // Simulate API save
    setTimeout(() => {
      setIsSaving(false);
      console.log("Document saved:", html.length, "chars");
    }, 800);
  }, []);

  const tabs: { id: EditorTab; label: string; icon: string; desc: string }[] = [
    { id: "document", label: "Document", icon: "📝", desc: "Editeur Word-like" },
    { id: "spreadsheet", label: "Tableur", icon: "📊", desc: "Tableur Excel-like" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 shrink-0">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.icon}</span>
              <div className="text-left">
                <p className="text-xs font-medium">{tab.label}</p>
                <p className="text-[10px] text-muted-foreground font-normal">{tab.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Sauvegarde...
            </span>
          )}
          <button
            onClick={() => handleSave(docContent)}
            className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "document" && (
          <DocumentEditor
            content={docContent}
            onChange={setDocContent}
            onSave={handleSave}
            documentTitle={docTitle}
            onTitleChange={setDocTitle}
          />
        )}
        {activeTab === "spreadsheet" && (
          <Spreadsheet
            data={spreadData}
            onDataChange={setSpreadData}
            sheetName="Budget"
          />
        )}
      </div>
    </div>
  );
}
