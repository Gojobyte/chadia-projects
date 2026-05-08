"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BudgetLine {
  id: string;
  categorie: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  unite: string;
  tva: number; // pourcentage
  sousCategorie?: string;
}

export interface BudgetCategory {
  id: string;
  nom: string;
  lignes: BudgetLine[];
  couleur: string;
}

interface BudgetGridProps {
  categories?: BudgetCategory[];
  onChange?: (categories: BudgetCategory[]) => void;
  readOnly?: boolean;
  devise?: "FCFA" | "EUR" | "USD";
  onDeviseChange?: (devise: "FCFA" | "EUR" | "USD") => void;
}

const DEFAULT_CATEGORIES: BudgetCategory[] = [
  {
    id: "rh",
    nom: "Ressources Humaines",
    couleur: "#3b82f6",
    lignes: [
      { id: "rh-1", categorie: "RH", description: "Chef de projet", quantite: 1, prixUnitaire: 0, unite: "mois", tva: 0 },
      { id: "rh-2", categorie: "RH", description: "Consultant technique", quantite: 1, prixUnitaire: 0, unite: "mois", tva: 0 },
      { id: "rh-3", categorie: "RH", description: "Assistant administratif", quantite: 1, prixUnitaire: 0, unite: "mois", tva: 0 },
    ],
  },
  {
    id: "equipement",
    nom: "Équipements",
    couleur: "#8b5cf6",
    lignes: [
      { id: "eq-1", categorie: "Équipement", description: "Ordinateurs portables", quantite: 0, prixUnitaire: 0, unite: "unité", tva: 19.25 },
      { id: "eq-2", categorie: "Équipement", description: "Serveur", quantite: 0, prixUnitaire: 0, unite: "unité", tva: 19.25 },
      { id: "eq-3", categorie: "Équipement", description: "Imprimante", quantite: 0, prixUnitaire: 0, unite: "unité", tva: 19.25 },
    ],
  },
  {
    id: "deplacement",
    nom: "Déplacements",
    couleur: "#f59e0b",
    lignes: [
      { id: "dep-1", categorie: "Déplacement", description: "Billets d'avion", quantite: 0, prixUnitaire: 0, unite: "unité", tva: 0 },
      { id: "dep-2", categorie: "Déplacement", description: "Hébergement", quantite: 0, prixUnitaire: 0, unite: "nuit", tva: 0 },
      { id: "dep-3", categorie: "Déplacement", description: "Transport local", quantite: 0, prixUnitaire: 0, unite: "jour", tva: 0 },
    ],
  },
  {
    id: "fonctionnement",
    nom: "Fonctionnement",
    couleur: "#10b981",
    lignes: [
      { id: "fonc-1", categorie: "Fonctionnement", description: "Fournitures bureau", quantite: 0, prixUnitaire: 0, unite: "mois", tva: 19.25 },
      { id: "fonc-2", categorie: "Fonctionnement", description: "Communication", quantite: 0, prixUnitaire: 0, unite: "mois", tva: 19.25 },
      { id: "fonc-3", categorie: "Fonctionnement", description: "Formation", quantite: 0, prixUnitaire: 0, unite: "session", tva: 0 },
    ],
  },
];

const DEVISE_SYMBOLS: Record<string, string> = {
  FCFA: "FCFA",
  EUR: "€",
  USD: "$",
};

function formatMontant(montant: number, devise: string): string {
  if (devise === "FCFA") {
    return montant.toLocaleString("fr-FR") + " FCFA";
  }
  return montant.toLocaleString("fr-FR", {
    style: "currency",
    currency: devise,
  });
}

export function BudgetGrid({
  categories = DEFAULT_CATEGORIES,
  onChange,
  readOnly = false,
  devise = "FCFA",
  onDeviseChange,
}: BudgetGridProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );
  const [editingCell, setEditingCell] = useState<{
    lineId: string;
    field: string;
  } | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateLine = useCallback(
    (categoryId: string, lineId: string, field: keyof BudgetLine, value: string | number) => {
      const updated = categories.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          lignes: cat.lignes.map((line) => {
            if (line.id !== lineId) return line;
            return { ...line, [field]: value };
          }),
        };
      });
      onChange?.(updated);
    },
    [categories, onChange]
  );

  const addLine = useCallback(
    (categoryId: string) => {
      const updated = categories.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const newLine: BudgetLine = {
          id: `new-${Date.now()}`,
          categorie: cat.nom,
          description: "Nouvelle ligne",
          quantite: 0,
          prixUnitaire: 0,
          unite: "unité",
          tva: 0,
        };
        return { ...cat, lignes: [...cat.lignes, newLine] };
      });
      onChange?.(updated);
    },
    [categories, onChange]
  );

  const removeLine = useCallback(
    (categoryId: string, lineId: string) => {
      const updated = categories.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          lignes: cat.lignes.filter((l) => l.id !== lineId),
        };
      });
      onChange?.(updated);
    },
    [categories, onChange]
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { ht: number; tva: number; ttc: number }> = {};
    for (const cat of categories) {
      let ht = 0;
      let tva = 0;
      for (const line of cat.lignes) {
        const lineHT = line.quantite * line.prixUnitaire;
        const lineTVA = lineHT * (line.tva / 100);
        ht += lineHT;
        tva += lineTVA;
      }
      totals[cat.id] = { ht, tva, ttc: ht + tva };
    }
    return totals;
  }, [categories]);

  const grandTotal = useMemo(() => {
    let ht = 0;
    let tva = 0;
    for (const cat of Object.values(categoryTotals)) {
      ht += cat.ht;
      tva += cat.tva;
    }
    return { ht, tva, ttc: ht + tva };
  }, [categoryTotals]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Grille Budgétaire</h2>
          <p className="text-xs text-muted-foreground">
            Devise : {devise} ({DEVISE_SYMBOLS[devise]})
          </p>
        </div>
        <div className="flex gap-2">
          {(["FCFA", "EUR", "USD"] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDeviseChange?.(d)}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                devise === d
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Budget table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-2 font-medium w-8"></th>
              <th className="text-left p-2 font-medium">Description</th>
              <th className="text-right p-2 font-medium w-20">Qté</th>
              <th className="text-left p-2 font-medium w-16">Unité</th>
              <th className="text-right p-2 font-medium w-28">Prix unit.</th>
              <th className="text-right p-2 font-medium w-20">TVA %</th>
              <th className="text-right p-2 font-medium w-28">Montant HT</th>
              <th className="text-right p-2 font-medium w-28">Montant TTC</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const total = categoryTotals[category.id];

              return (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  isExpanded={isExpanded}
                  total={total}
                  devise={devise}
                  readOnly={readOnly}
                  editingCell={editingCell}
                  onToggle={() => toggleCategory(category.id)}
                  onUpdateLine={updateLine}
                  onAddLine={addLine}
                  onRemoveLine={removeLine}
                  onEditCell={setEditingCell}
                />
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-semibold border-t-2">
              <td colSpan={6} className="p-2 text-right">
                TOTAL GÉNÉRAL
              </td>
              <td className="p-2 text-right">
                {formatMontant(grandTotal.ht, devise)}
              </td>
              <td className="p-2 text-right">
                {formatMontant(grandTotal.ttc, devise)}
              </td>
              {!readOnly && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total HT</p>
          <p className="text-lg font-bold">{formatMontant(grandTotal.ht, devise)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">TVA</p>
          <p className="text-lg font-bold text-amber-600">
            {formatMontant(grandTotal.tva, devise)}
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-primary/5">
          <p className="text-xs text-muted-foreground">Total TTC</p>
          <p className="text-lg font-bold text-primary">
            {formatMontant(grandTotal.ttc, devise)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function CategoryGroup({
  category,
  isExpanded,
  total,
  devise,
  readOnly,
  editingCell,
  onToggle,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onEditCell,
}: {
  category: BudgetCategory;
  isExpanded: boolean;
  total: { ht: number; tva: number; ttc: number };
  devise: string;
  readOnly: boolean;
  editingCell: { lineId: string; field: string } | null;
  onToggle: () => void;
  onUpdateLine: (catId: string, lineId: string, field: keyof BudgetLine, value: string | number) => void;
  onAddLine: (catId: string) => void;
  onRemoveLine: (catId: string, lineId: string) => void;
  onEditCell: (cell: { lineId: string; field: string } | null) => void;
}) {
  return (
    <>
      {/* Category header */}
      <tr
        className="bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <td className="p-2">
          <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
        </td>
        <td className="p-2 font-medium" colSpan={2}>
          <span
            className="inline-block w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: category.couleur }}
          />
          {category.nom}
        </td>
        <td colSpan={3} className="p-2 text-right text-xs text-muted-foreground">
          Sous-total HT: {formatMontant(total.ht, devise)}
        </td>
        <td className="p-2 text-right text-xs font-medium">
          {formatMontant(total.ttc, devise)}
        </td>
        {!readOnly && (
          <td className="p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddLine(category.id);
              }}
              className="p-1 rounded hover:bg-muted text-xs"
              title="Ajouter une ligne"
            >
              +
            </button>
          </td>
        )}
      </tr>

      {/* Lines */}
      {isExpanded &&
        category.lignes.map((line) => {
          const montantHT = line.quantite * line.prixUnitaire;
          const montantTTC = montantHT * (1 + line.tva / 100);

          return (
            <BudgetLineRow
              key={line.id}
              line={line}
              montantHT={montantHT}
              montantTTC={montantTTC}
              devise={devise}
              readOnly={readOnly}
              isEditing={editingCell?.lineId === line.id}
              editingField={editingCell?.lineId === line.id ? editingCell.field : null}
              onUpdate={(field, value) => onUpdateLine(category.id, line.id, field, value)}
              onRemove={() => onRemoveLine(category.id, line.id)}
              onEditCell={(field) =>
                onEditCell(field ? { lineId: line.id, field } : null)
              }
            />
          );
        })}
    </>
  );
}

function BudgetLineRow({
  line,
  montantHT,
  montantTTC,
  devise,
  readOnly,
  isEditing,
  editingField,
  onUpdate,
  onRemove,
  onEditCell,
}: {
  line: BudgetLine;
  montantHT: number;
  montantTTC: number;
  devise: string;
  readOnly: boolean;
  isEditing: boolean;
  editingField: string | null;
  onUpdate: (field: keyof BudgetLine, value: string | number) => void;
  onRemove: () => void;
  onEditCell: (field: string | null) => void;
}) {
  return (
    <tr className="border-t hover:bg-muted/10 transition-colors">
      <td className="p-1"></td>
      <td className="p-1">
        {isEditing && editingField === "description" ? (
          <input
            autoFocus
            className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            value={line.description}
            onChange={(e) => onUpdate("description", e.target.value)}
            onBlur={() => onEditCell(null)}
            onKeyDown={(e) => e.key === "Enter" && onEditCell(null)}
          />
        ) : (
          <span
            className={cn("text-sm", !readOnly && "cursor-pointer hover:text-primary")}
            onDoubleClick={() => !readOnly && onEditCell("description")}
          >
            {line.description}
          </span>
        )}
      </td>
      <td className="p-1 text-right">
        {isEditing && editingField === "quantite" ? (
          <input
            autoFocus
            type="number"
            min={0}
            className="w-full px-1 py-0.5 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
            value={line.quantite}
            onChange={(e) => onUpdate("quantite", parseFloat(e.target.value) || 0)}
            onBlur={() => onEditCell(null)}
            onKeyDown={(e) => e.key === "Enter" && onEditCell(null)}
          />
        ) : (
          <span
            className={cn("text-sm", !readOnly && "cursor-pointer hover:text-primary")}
            onDoubleClick={() => !readOnly && onEditCell("quantite")}
          >
            {line.quantite}
          </span>
        )}
      </td>
      <td className="p-1">
        {isEditing && editingField === "unite" ? (
          <select
            autoFocus
            className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            value={line.unite}
            onChange={(e) => {
              onUpdate("unite", e.target.value);
              onEditCell(null);
            }}
          >
            {["unité", "mois", "jour", "nuit", "session", "heure", "kg", "litre"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={cn("text-xs text-muted-foreground", !readOnly && "cursor-pointer hover:text-primary")}
            onDoubleClick={() => !readOnly && onEditCell("unite")}
          >
            {line.unite}
          </span>
        )}
      </td>
      <td className="p-1 text-right">
        {isEditing && editingField === "prixUnitaire" ? (
          <input
            autoFocus
            type="number"
            min={0}
            className="w-full px-1 py-0.5 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
            value={line.prixUnitaire}
            onChange={(e) => onUpdate("prixUnitaire", parseFloat(e.target.value) || 0)}
            onBlur={() => onEditCell(null)}
            onKeyDown={(e) => e.key === "Enter" && onEditCell(null)}
          />
        ) : (
          <span
            className={cn("text-sm", !readOnly && "cursor-pointer hover:text-primary")}
            onDoubleClick={() => !readOnly && onEditCell("prixUnitaire")}
          >
            {formatMontant(line.prixUnitaire, devise)}
          </span>
        )}
      </td>
      <td className="p-1 text-right">
        {isEditing && editingField === "tva" ? (
          <input
            autoFocus
            type="number"
            min={0}
            max={100}
            step={0.25}
            className="w-full px-1 py-0.5 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
            value={line.tva}
            onChange={(e) => onUpdate("tva", parseFloat(e.target.value) || 0)}
            onBlur={() => onEditCell(null)}
            onKeyDown={(e) => e.key === "Enter" && onEditCell(null)}
          />
        ) : (
          <span
            className={cn("text-sm", !readOnly && "cursor-pointer hover:text-primary")}
            onDoubleClick={() => !readOnly && onEditCell("tva")}
          >
            {line.tva}%
          </span>
        )}
      </td>
      <td className="p-1 text-right text-sm font-medium">
        {formatMontant(montantHT, devise)}
      </td>
      <td className="p-1 text-right text-sm">
        {formatMontant(montantTTC, devise)}
      </td>
      {!readOnly && (
        <td className="p-1">
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-destructive/10 text-destructive/50 hover:text-destructive text-xs transition-colors"
            title="Supprimer"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  );
}
