"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CellPosition { row: number; col: number }
interface CellRange { start: CellPosition; end: CellPosition }
interface CellStyle {
  bold?: boolean; italic?: boolean; underline?: boolean;
  align?: "left" | "center" | "right";
  bgColor?: string; textColor?: string; fontSize?: number;
  format?: "text" | "number" | "currency" | "percent" | "date";
}
export interface CellData { value: string; formula?: string; style?: CellStyle; }

interface ConditionalRule {
  id: string;
  range: string; // e.g. "A1:A10"
  condition: "gt" | "lt" | "gte" | "lte" | "eq" | "neq" | "contains" | "between";
  value: string;
  value2?: string; // for between
  style: Partial<CellStyle>;
}

export interface Sheet {
  id: string;
  name: string;
  data: Record<string, CellData>;
  frozenRows: number;
  frozenCols: number;
  conditionalRules: ConditionalRule[];
}

interface Props {
  sheets?: Sheet[];
  activeSheetId?: string;
  onSheetsChange?: (sheets: Sheet[]) => void;
  onSave?: (sheets: Sheet[]) => void;
  readOnly?: boolean;
}

type SelMode = "single" | "range" | "col" | "row";

const DEF_W = 100, DEF_H = 24;

function colLetter(c: number) {
  let r = "";
  for (let i = c; i >= 0; i = Math.floor(i / 26) - 1) r = String.fromCharCode(65 + (i % 26)) + r;
  return r;
}

function parseKey(k: string): CellPosition {
  const m = k.match(/^([A-Z]+)(\d+)$/);
  if (!m) return { row: 0, col: 0 };
  let col = 0;
  for (let i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
  return { row: parseInt(m[2]) - 1, col: col - 1 };
}

function cKey(r: number, c: number) { return colLetter(c) + (r + 1); }

function parseRange(range: string): { start: CellPosition; end: CellPosition } | null {
  const m = range.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
  if (!m) return null;
  return { start: parseKey(m[1]), end: parseKey(m[2]) };
}

const FORMULAS: Record<string, (expr: string, data: Record<string, CellData>) => string> = {
  SUM(expr, data) {
    const m = expr.match(/\(([A-Z]+\d+):([A-Z]+\d+)\)/);
    if (!m) return "0";
    const a = parseKey(m[1]), b = parseKey(m[2]);
    let s = 0;
    for (let r2 = a.row; r2 <= b.row; r2++)
      for (let c = a.col; c <= b.col; c++) { const n = parseFloat(data[cKey(r2, c)]?.value || "0"); if (!isNaN(n)) s += n; }
    return String(s);
  },
  AVERAGE(expr, data) {
    const m = expr.match(/\(([A-Z]+\d+):([A-Z]+\d+)\)/);
    if (!m) return "0";
    const a = parseKey(m[1]), b = parseKey(m[2]);
    let s = 0, cnt = 0;
    for (let r2 = a.row; r2 <= b.row; r2++)
      for (let c = a.col; c <= b.col; c++) { const n = parseFloat(data[cKey(r2, c)]?.value || "0"); if (!isNaN(n)) { s += n; cnt++; } }
    return cnt > 0 ? String(Math.round(s / cnt * 100) / 100) : "0";
  },
  COUNT(expr, data) {
    const m = expr.match(/\(([A-Z]+\d+):([A-Z]+\d+)\)/);
    if (!m) return "0";
    const a = parseKey(m[1]), b = parseKey(m[2]);
    let cnt = 0;
    for (let r2 = a.row; r2 <= b.row; r2++)
      for (let c = a.col; c <= b.col; c++) { const n = parseFloat(data[cKey(r2, c)]?.value || ""); if (!isNaN(n)) cnt++; }
    return String(cnt);
  },
  MAX(expr, data) {
    const m = expr.match(/\(([A-Z]+\d+):([A-Z]+\d+)\)/);
    if (!m) return "0";
    const a = parseKey(m[1]), b = parseKey(m[2]);
    let max = -Infinity;
    for (let r2 = a.row; r2 <= b.row; r2++)
      for (let c = a.col; c <= b.col; c++) { const n = parseFloat(data[cKey(r2, c)]?.value || "0"); if (!isNaN(n) && n > max) max = n; }
    return isFinite(max) ? String(max) : "0";
  },
  MIN(expr, data) {
    const m = expr.match(/\(([A-Z]+\d+):([A-Z]+\d+)\)/);
    if (!m) return "0";
    const a = parseKey(m[1]), b = parseKey(m[2]);
    let min = Infinity;
    for (let r2 = a.row; r2 <= b.row; r2++)
      for (let c = a.col; c <= b.col; c++) { const n = parseFloat(data[cKey(r2, c)]?.value || "0"); if (!isNaN(n) && n < min) min = n; }
    return isFinite(min) ? String(min) : "0";
  },
  SI(expr, data) {
    const m = expr.match(/SI\(([A-Z]+\d+)(>|<|>=|<=|=|<>)([^,]+),([^,]+),([^)]+)\)/);
    if (!m) return expr;
    const cellRef = m[1];
    const op = m[2];
    const compareVal = parseFloat(m[3]);
    const cellVal = parseFloat(data[cellRef]?.value || "0");
    let res = false;
    if (op === ">") res = cellVal > compareVal;
    else if (op === "<") res = cellVal < compareVal;
    else if (op === ">=") res = cellVal >= compareVal;
    else if (op === "<=") res = cellVal <= compareVal;
    else if (op === "=") res = cellVal === compareVal;
    else if (op === "<>") res = cellVal !== compareVal;
    return res ? m[4].trim() : m[5].trim();
  },
};

function evalFormula(formula: string, data: Record<string, CellData>): string {
  const upper = formula.slice(1).trim().toUpperCase();
  for (const [name, fn] of Object.entries(FORMULAS)) {
    if (upper.startsWith(name)) return fn(upper, data);
  }
  return formula;
}

function fmtVal(v: string, f?: CellStyle["format"]) {
  if (!v || !f || f === "text") return v;
  const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
  if (isNaN(n)) return v;
  if (f === "number") return n.toLocaleString("fr-FR");
  if (f === "currency") return n.toLocaleString("fr-FR") + " FCFA";
  if (f === "percent") return (n * 100).toFixed(1) + " %";
  return v;
}

function evaluateConditionalRules(cellKey: string, cellValue: string, rules: ConditionalRule[]): Partial<CellStyle> | null {
  for (const rule of rules) {
    const range = parseRange(rule.range);
    if (!range) continue;
    const pos = parseKey(cellKey);
    const mr = Math.min(range.start.row, range.end.row), Mr = Math.max(range.start.row, range.end.row);
    const mc = Math.min(range.start.col, range.end.col), Mc = Math.max(range.start.col, range.end.col);
    if (pos.row < mr || pos.row > Mr || pos.col < mc || pos.col > Mc) continue;

    const numVal = parseFloat(cellValue);
    const ruleVal = parseFloat(rule.value);
    const ruleVal2 = rule.value2 ? parseFloat(rule.value2) : undefined;
    let matches = false;

    if (rule.condition === "contains") {
      matches = cellValue.toLowerCase().includes(rule.value.toLowerCase());
    } else if (!isNaN(numVal) && !isNaN(ruleVal)) {
      switch (rule.condition) {
        case "gt": matches = numVal > ruleVal; break;
        case "lt": matches = numVal < ruleVal; break;
        case "gte": matches = numVal >= ruleVal; break;
        case "lte": matches = numVal <= ruleVal; break;
        case "eq": matches = numVal === ruleVal; break;
        case "neq": matches = numVal !== ruleVal; break;
        case "between": matches = ruleVal2 !== undefined && numVal >= ruleVal && numVal <= ruleVal2; break;
      }
    }

    if (matches) return rule.style;
  }
  return null;
}

function createDefaultSheet(id: string, name: string): Sheet {
  return { id, name, data: {}, frozenRows: 0, frozenCols: 0, conditionalRules: [] };
}

export function Spreadsheet({ sheets: initSheets, activeSheetId, onSheetsChange, onSave, readOnly = false }: Props) {
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    if (initSheets && initSheets.length > 0) return initSheets;
    return [createDefaultSheet("sheet-1", "Feuille 1")];
  });
  const [activeId, setActiveId] = useState(activeSheetId || sheets[0]?.id || "sheet-1");
  const [sel, setSel] = useState<CellPosition | null>(null);
  const [range, setRange] = useState<CellRange | null>(null);
  const [selMode, setSelMode] = useState<SelMode>("single");
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [fBar, setFBar] = useState("");
  const [cw, setCw] = useState<Record<number, number>>({});
  const [sort, setSort] = useState<{ col: number; asc: boolean } | null>(null);
  const [showCondFormat, setShowCondFormat] = useState(false);
  const [newRuleRange, setNewRuleRange] = useState("A1:A10");
  const [newRuleCond, setNewRuleCond] = useState<ConditionalRule["condition"]>("gt");
  const [newRuleValue, setNewRuleValue] = useState("0");
  const [newRuleBg, setNewRuleBg] = useState("#fef08a");
  const inputRef = useRef<HTMLInputElement>(null);
  const condRuleCounter = useRef(0);

  const sheet = sheets.find(s => s.id === activeId) || sheets[0];
  const data = sheet?.data || {};
  const ROWS = 50;
  const COLS = 20;

  const updateSheet = useCallback((sheetId: string, updates: Partial<Sheet>) => {
    setSheets(prev => {
      const next = prev.map(s => s.id === sheetId ? { ...s, ...updates } : s);
      onSheetsChange?.(next);
      return next;
    });
  }, [onSheetsChange]);

  const gCW = (c: number) => cw[c] || DEF_W;

  const getVal = useCallback((r: number, c: number) => {
    const k = cKey(r, c), cell = data[k];
    if (!cell) return "";
    return cell.formula ? evalFormula(cell.formula, data) : fmtVal(cell.value, cell.style?.format);
  }, [data]);

  const setSheetVal = useCallback((r: number, c: number, v: string) => {
    const k = cKey(r, c);
    updateSheet(activeId, {
      data: { ...data, [k]: { ...data[k], value: v, formula: v.startsWith("=") ? v : undefined } }
    });
  }, [data, activeId, updateSheet]);

  const applyStyle = useCallback((u: Partial<CellStyle>) => {
    if (!sel) return;
    const targets: CellPosition[] = [];
    if (selMode === "single") targets.push(sel);
    else if (selMode === "col") for (let r2 = 0; r2 < ROWS; r2++) targets.push({ row: r2, col: sel.col });
    else if (selMode === "row") for (let c = 0; c < COLS; c++) targets.push({ row: sel.row, col: c });
    else if (range) {
      const mr2 = Math.min(range.start.row, range.end.row), Mr2 = Math.max(range.start.row, range.end.row);
      const mc2 = Math.min(range.start.col, range.end.col), Mc2 = Math.max(range.start.col, range.end.col);
      for (let r2 = mr2; r2 <= Mr2; r2++) for (let c = mc2; c <= Mc2; c++) targets.push({ row: r2, col: c });
    }
    const newData = { ...data };
    for (const p of targets) {
      const k = cKey(p.row, p.col);
      newData[k] = { ...newData[k], value: newData[k]?.value || "", style: { ...newData[k]?.style, ...u } };
    }
    updateSheet(activeId, { data: newData });
  }, [sel, selMode, range, ROWS, COLS, data, activeId, updateSheet]);

  const isSel = useCallback((r: number, c: number) => {
    if (!sel) return false;
    if (selMode === "single") return sel.row === r && sel.col === c;
    if (selMode === "col") return sel.col === c;
    if (selMode === "row") return sel.row === r;
    if (range) {
      const mr2 = Math.min(range.start.row, range.end.row), Mr2 = Math.max(range.start.row, range.end.row);
      const mc2 = Math.min(range.start.col, range.end.col), Mc2 = Math.max(range.start.col, range.end.col);
      return r >= mr2 && r <= Mr2 && c >= mc2 && c <= Mc2;
    }
    return false;
  }, [sel, selMode, range]);

  const inRng = useCallback((r: number, c: number) => {
    if (selMode !== "range" || !range) return false;
    const mr2 = Math.min(range.start.row, range.end.row), Mr2 = Math.max(range.start.row, range.end.row);
    const mc2 = Math.min(range.start.col, range.end.col), Mc2 = Math.max(range.start.col, range.end.col);
    return r >= mr2 && r <= Mr2 && c >= mc2 && c <= Mc2 && !isSel(r, c);
  }, [selMode, range, isSel]);

  const clickCell = useCallback((r: number, c: number, shift: boolean) => {
    if (readOnly) return;
    if (shift && sel) { setSelMode("range"); setRange({ start: sel, end: { row: r, col: c } }); }
    else { setSel({ row: r, col: c }); setSelMode("single"); setRange(null); setFBar(data[cKey(r, c)]?.formula || data[cKey(r, c)]?.value || ""); }
  }, [sel, data, readOnly]);

  const dblClick = useCallback((r: number, c: number) => {
    if (readOnly) return;
    const k = cKey(r, c);
    setEditing(k); setEditVal(data[k]?.formula || data[k]?.value || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [data, readOnly]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (editing) {
      if (e.key === "Enter") { const p = parseKey(editing); setSheetVal(p.row, p.col, editVal); setEditing(null); if (p.row < ROWS - 1) setSel({ row: p.row + 1, col: p.col }); }
      else if (e.key === "Tab") { e.preventDefault(); const p = parseKey(editing); setSheetVal(p.row, p.col, editVal); setEditing(null); setSel({ row: p.row, col: Math.min(p.col + 1, COLS - 1) }); }
      else if (e.key === "Escape") setEditing(null);
      return;
    }
    if (!sel) return;
    const mv = (dr: number, dc: number) => setSel({ row: Math.max(0, Math.min(ROWS - 1, sel.row + dr)), col: Math.max(0, Math.min(COLS - 1, sel.col + dc)) });
    if (e.key === "Enter" && sel.row < ROWS - 1) mv(1, 0);
    else if (e.key === "Tab") { e.preventDefault(); mv(0, 1); }
    else if (e.key === "ArrowUp") mv(-1, 0);
    else if (e.key === "ArrowDown") mv(1, 0);
    else if (e.key === "ArrowLeft") mv(0, -1);
    else if (e.key === "ArrowRight") mv(0, 1);
    else if (e.key === "Delete" || e.key === "Backspace") setSheetVal(sel.row, sel.col, "");
    else if (e.key === "F2") dblClick(sel.row, sel.col);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { setEditing(cKey(sel.row, sel.col)); setEditVal(e.key); }
  }, [editing, editVal, sel, readOnly, setSheetVal, dblClick]);

  const doSort = useCallback((col: number) => setSort(prev => ({ col, asc: prev?.col === col ? !prev.asc : true })), []);
  const toggleFreezeRows = useCallback(() => updateSheet(activeId, { frozenRows: sheet.frozenRows > 0 ? 0 : (sel?.row ?? 0) + 1 }), [activeId, sheet.frozenRows, sel]);
  const toggleFreezeCols = useCallback(() => updateSheet(activeId, { frozenCols: sheet.frozenCols > 0 ? 0 : (sel?.col ?? 0) + 1 }), [activeId, sheet.frozenCols, sel]);

  const addConditionalRule = useCallback(() => {
    const rule: ConditionalRule = {
      id: `rule-${++condRuleCounter.current}`,
      range: newRuleRange,
      condition: newRuleCond,
      value: newRuleValue,
      style: { bgColor: newRuleBg },
    };
    updateSheet(activeId, { conditionalRules: [...sheet.conditionalRules, rule] });
    setShowCondFormat(false);
  }, [activeId, sheet.conditionalRules, newRuleRange, newRuleCond, newRuleValue, newRuleBg, updateSheet]);

  const removeConditionalRule = useCallback((id: string) => {
    updateSheet(activeId, { conditionalRules: sheet.conditionalRules.filter(r => r.id !== id) });
  }, [activeId, sheet.conditionalRules, updateSheet]);

  const addSheet = useCallback(() => {
    const id = `sheet-${Date.now()}`;
    const newSheets = [...sheets, createDefaultSheet(id, `Feuille ${sheets.length + 1}`)];
    setSheets(newSheets); setActiveId(id); onSheetsChange?.(newSheets);
  }, [sheets, onSheetsChange]);

  const removeSheet = useCallback((id: string) => {
    if (sheets.length <= 1) return;
    const newSheets = sheets.filter(s => s.id !== id);
    setSheets(newSheets);
    if (activeId === id) setActiveId(newSheets[0].id);
    onSheetsChange?.(newSheets);
  }, [sheets, activeId, onSheetsChange]);

  const renameSheet = useCallback((id: string, name: string) => {
    setSheets(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, []);

  const display = useMemo(() => {
    if (!sort) return data;
    const col = sort.col;
    const rows: { row: number; val: string }[] = [];
    for (let r2 = 0; r2 < ROWS; r2++) rows.push({ row: r2, val: data[cKey(r2, col)]?.value || "" });
    rows.sort((a, b) => { const na = parseFloat(a.val), nb = parseFloat(b.val); if (!isNaN(na) && !isNaN(nb)) return sort.asc ? na - nb : nb - na; return sort.asc ? a.val.localeCompare(b.val) : b.val.localeCompare(a.val); });
    const nd: Record<string, CellData> = {};
    rows.forEach((item, nr) => { for (let c = 0; c < COLS; c++) { const ok = cKey(item.row, c); if (data[ok]) nd[cKey(nr, c)] = data[ok]; } });
    return nd;
  }, [data, sort]);

  const getCellStyle = useCallback((r: number, c: number, baseStyle: CellStyle | undefined): CellStyle => {
    const k = cKey(r, c);
    const cellVal = display[k]?.value || data[k]?.value || "";
    const condStyle = evaluateConditionalRules(k, cellVal, sheet.conditionalRules);
    return { ...baseStyle, ...condStyle };
  }, [display, data, sheet.conditionalRules]);

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden" tabIndex={0} onKeyDown={onKey}>
      {/* Sheet tabs */}
      <div className="flex items-center gap-0 px-1 border-b bg-muted/20 shrink-0 overflow-x-auto">
        {sheets.map(s => (
          <div key={s.id} className="flex items-center group">
            <button
              onClick={() => setActiveId(s.id)}
              onDoubleClick={() => {
                const name = window.prompt("Nom de la feuille:", s.name);
                if (name) renameSheet(s.id, name);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                s.id === activeId ? "bg-card text-foreground border-t-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.name}
            </button>
            {sheets.length > 1 && (
              <button onClick={() => removeSheet(s.id)} className="ml-0.5 mr-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs">x</button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button onClick={addSheet} className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0">+</button>
        )}
        <div className="flex-1" />
        {/* Freeze panes indicator */}
        {(sheet.frozenRows > 0 || sheet.frozenCols > 0) && (
          <span className="text-[9px] text-muted-foreground px-2">
            Figé: {sheet.frozenRows > 0 && `${sheet.frozenRows}L`} {sheet.frozenCols > 0 && `${sheet.frozenCols}C`}
          </span>
        )}
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b bg-muted/30 shrink-0">
          <button onClick={() => applyStyle({ bold: true })} title="Gras" className="w-7 h-7 rounded hover:bg-muted text-xs font-bold">B</button>
          <button onClick={() => applyStyle({ italic: true })} title="Italique" className="w-7 h-7 rounded hover:bg-muted text-xs italic">I</button>
          <button onClick={() => applyStyle({ underline: true })} title="Souligne" className="w-7 h-7 rounded hover:bg-muted text-xs underline">U</button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={() => applyStyle({ align: "left" })} title="Aligner a gauche" className="w-7 h-7 rounded hover:bg-muted text-xs">AL</button>
          <button onClick={() => applyStyle({ align: "center" })} title="Centrer" className="w-7 h-7 rounded hover:bg-muted text-xs">AC</button>
          <button onClick={() => applyStyle({ align: "right" })} title="Aligner a droite" className="w-7 h-7 rounded hover:bg-muted text-xs">AR</button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <select onChange={e => applyStyle({ format: e.target.value as CellStyle["format"] })} className="h-6 px-1 rounded border bg-card text-[10px]" defaultValue="">
            <option value="">Format</option>
            <option value="text">Texte</option>
            <option value="number">Nombre</option>
            <option value="currency">Monetaire</option>
            <option value="percent">%</option>
          </select>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button onClick={() => sel && doSort(sel.col)} disabled={!sel} title="Trier" className="w-7 h-7 rounded hover:bg-muted text-xs">Sort</button>
          <button onClick={toggleFreezeRows} title="Figer les lignes" className={cn("w-7 h-7 rounded text-xs", sheet.frozenRows > 0 && "bg-primary/20")}>FR</button>
          <button onClick={toggleFreezeCols} title="Figer les colonnes" className={cn("w-7 h-7 rounded text-xs", sheet.frozenCols > 0 && "bg-primary/20")}>FC</button>
          <button onClick={() => setShowCondFormat(true)} title="Mise en forme conditionnelle" className={cn("w-7 h-7 rounded text-xs", sheet.conditionalRules.length > 0 && "bg-primary/20")}>CF</button>
          <div className="flex-1" />
          <span className="text-[9px] text-muted-foreground px-1">{sheet.conditionalRules.length} regles</span>
        </div>
      )}

      {/* Conditional formatting panel */}
      {showCondFormat && !readOnly && (
        <div className="border-b bg-muted/10 px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">Mise en forme conditionnelle</span>
            <input value={newRuleRange} onChange={e => setNewRuleRange(e.target.value)} placeholder="A1:A10" className="h-6 w-20 px-1 text-xs border rounded bg-card" />
            <select value={newRuleCond} onChange={e => setNewRuleCond(e.target.value as ConditionalRule["condition"])} className="h-6 px-1 text-xs border rounded bg-card">
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
              <option value="gte">&ge;</option>
              <option value="lte">&le;</option>
              <option value="eq">=</option>
              <option value="neq">&ne;</option>
              <option value="contains">contient</option>
              <option value="between">entre</option>
            </select>
            <input value={newRuleValue} onChange={e => setNewRuleValue(e.target.value)} placeholder="Valeur" className="h-6 w-16 px-1 text-xs border rounded bg-card" />
            <label title="Couleur de fond" className="relative w-6 h-6 rounded border cursor-pointer">
              <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: newRuleBg }} />
              <input type="color" value={newRuleBg} onChange={e => setNewRuleBg(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <button onClick={addConditionalRule} className="h-6 px-2 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90">Ajouter</button>
            <button onClick={() => setShowCondFormat(false)} className="h-6 px-2 text-xs rounded hover:bg-muted">Fermer</button>
          </div>
          {/* Active rules */}
          {sheet.conditionalRules.length > 0 && (
            <div className="mt-2 space-y-1">
              {sheet.conditionalRules.map(rule => (
                <div key={rule.id} className="flex items-center gap-2 text-[10px]">
                  <span className="px-1 rounded border bg-card">{rule.range}</span>
                  <span>{rule.condition}</span>
                  <span className="px-1 rounded border bg-card">{rule.value}</span>
                  <span className="w-3 h-3 rounded border" style={{ backgroundColor: rule.style.bgColor }} />
                  <button onClick={() => removeConditionalRule(rule.id)} className="text-destructive hover:text-destructive/80">Supprimer</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formula bar */}
      {sel && !readOnly && (
        <div className="flex items-center gap-2 px-2 py-1 border-b bg-muted/20 shrink-0">
          <span className="text-xs font-mono font-medium w-10 text-center text-muted-foreground">{cKey(sel.row, sel.col)}</span>
          <input type="text" value={fBar} onChange={e => { setFBar(e.target.value); setSheetVal(sel.row, sel.col, e.target.value); }}
            className="flex-1 h-6 px-2 text-xs border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            placeholder="Valeur ou formule (ex: =SOMME(A1:A10))" />
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className={cn("sticky top-0 left-0 z-20 bg-muted border-b border-r w-10 h-7", sheet.frozenRows > 0 && "z-30")} />
              {Array.from({ length: COLS }, (_, col) => {
                const isFrozen = sheet.frozenCols > 0 && col < sheet.frozenCols;
                return (
                  <th key={col}
                    className={cn("sticky top-0 z-10 bg-muted border-b border-r text-[10px] font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none h-7",
                      isFrozen && "z-30 border-r-2 border-r-primary/30")}
                    style={{ width: gCW(col), minWidth: gCW(col),
                      left: isFrozen ? `${40 + Array.from({length: col}, (_, i) => gCW(i)).reduce((a,b) => a+b, 0)}px` : undefined }}
                    onClick={() => { setSelMode("col"); setSel({ row: -1, col }); }}>
                    <div className="flex items-center justify-between px-1">
                      <span>{colLetter(col)}</span>
                      <button onClick={e => { e.stopPropagation(); doSort(col); }} className="text-[8px] hover:text-foreground">Sz</button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, row) => {
              const isRowFrozen = sheet.frozenRows > 0 && row < sheet.frozenRows;
              return (
                <tr key={row}>
                  <td className={cn("sticky left-0 z-10 bg-muted border-b border-r text-[10px] font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none text-center",
                    isRowFrozen && "z-30 border-b-2 border-b-primary/30")}
                    style={{ width: 40, height: DEF_H, top: isRowFrozen ? `${28 + Array.from({length: row}, (_, i) => DEF_H).reduce((a,b) => a+b, 0)}px` : undefined }}
                    onClick={() => { setSelMode("row"); setSel({ row, col: -1 }); }}>
                    {row + 1}
                  </td>
                  {Array.from({ length: COLS }, (_, col) => {
                    const k = cKey(row, col);
                    const cell = display[k];
                    const isEdit = editing === k;
                    const selected = isSel(row, col);
                    const isInR = inRng(row, col);
                    const isColFrozen = sheet.frozenCols > 0 && col < sheet.frozenCols;
                    const baseStyle = getCellStyle(row, col, cell?.style);
                    const st = baseStyle;
                    return (
                      <td key={col}
                        className={cn("border-b border-r relative overflow-hidden",
                          selected && "ring-2 ring-primary ring-inset z-10",
                          isInR && "bg-primary/5",
                          isColFrozen && "border-r-2 border-r-primary/30")}
                        style={{ width: gCW(col), minWidth: gCW(col), height: DEF_H,
                          textAlign: st?.align || "left", backgroundColor: st?.bgColor || "transparent",
                          color: st?.textColor || "inherit", fontSize: st?.fontSize ? st.fontSize + "px" : "12px",
                          left: isColFrozen ? `${40 + Array.from({length: col}, (_, i) => gCW(i)).reduce((a,b) => a+b, 0)}px` : undefined,
                          position: (isRowFrozen || isColFrozen) ? "sticky" as const : undefined,
                          zIndex: (isRowFrozen || isColFrozen) ? 20 : undefined }}
                        onClick={e => clickCell(row, col, e.shiftKey)}
                        onDoubleClick={() => dblClick(row, col)}>
                        {isEdit ? (
                          <input ref={inputRef} type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { setSheetVal(row, col, editVal); setEditing(null); } else if (e.key === "Escape") setEditing(null); }}
                            onBlur={() => { setSheetVal(row, col, editVal); setEditing(null); }}
                            className="absolute inset-0 w-full h-full px-1 text-xs border-none outline-none bg-white font-mono z-20" />
                        ) : (
                          <span className={cn("block px-1 truncate text-xs", st?.bold && "font-bold", st?.italic && "italic", st?.underline && "underline")}>{getVal(row, col)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-1 border-t bg-muted/20 text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-3">
          {sel && <span>{cKey(sel.row, sel.col)}{data[cKey(sel.row, sel.col)]?.formula ? " f " + data[cKey(sel.row, sel.col)]?.formula : ""}</span>}
          {range && <span className="text-primary">Plage: {cKey(range.start.row, range.start.col)}:{cKey(range.end.row, range.end.col)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span>{Object.keys(data).length} cellules</span>
          {sort && <span className="text-primary">Trie par {colLetter(sort.col)} {sort.asc ? "asc" : "desc"}</span>}
        </div>
      </div>
    </div>
  );
}
