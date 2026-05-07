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
interface Props {
  data?: Record<string, CellData>;
  onDataChange?: (d: Record<string, CellData>) => void;
  onSave?: (d: Record<string, CellData>) => void;
  readOnly?: boolean;
  sheetName?: string;
}
type SelMode = "single" | "range" | "col" | "row";

const ROWS = 50, COLS = 20, DEF_W = 100, DEF_H = 24;

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

function evalFormula(formula: string, data: Record<string, CellData>): string {
  const upper = formula.slice(1).trim().toUpperCase();
  const rangeMatch = upper.match(/(?:SOMME|AVERAGE|AVG|COUNT|MAX|MIN|SI)\(([A-Z]+\d+):([A-Z]+\d+)\)/);
  if (!rangeMatch) return formula;
  const a = parseKey(rangeMatch[1]), b = parseKey(rangeMatch[2]);
  const vals: number[] = [];
  for (let r = a.row; r <= b.row; r++)
    for (let c = a.col; c <= b.col; c++) {
      const n = parseFloat(data[cKey(r, c)]?.value || "0");
      if (!isNaN(n)) vals.push(n);
    }
  if (vals.length === 0) return "0";
  if (upper.startsWith("SOMME")) return String(vals.reduce((s, v) => s + v, 0));
  if (upper.startsWith("AVERAGE") || upper.startsWith("AVG")) return String(Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100);
  if (upper.startsWith("COUNT")) return String(vals.length);
  if (upper.startsWith("MAX")) return String(Math.max(...vals));
  if (upper.startsWith("MIN")) return String(Math.min(...vals));
  if (upper.startsWith("SI")) {
    const condMatch = upper.match(/SI\(([A-Z]+\d+)(>|<|>=|<=|=|<>)([^,]+),([^,]+),([^)]+)\)/);
    if (condMatch) {
      const cv = parseFloat(data[parseKey(condMatch[1]).col + ""]?.value || data[condMatch[1]]?.value || "0");
      const cmp = parseFloat(condMatch[3]);
      const op = condMatch[2];
      let res = false;
      if (op === ">") res = cv > cmp; else if (op === "<") res = cv < cmp;
      else if (op === ">=") res = cv >= cmp; else if (op === "<=") res = cv <= cmp;
      else if (op === "=") res = cv === cmp; else if (op === "<>") res = cv !== cmp;
      return res ? condMatch[4].trim() : condMatch[5].trim();
    }
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

export function Spreadsheet({ data: initData = {}, onDataChange, onSave, readOnly = false, sheetName = "Feuille 1" }: Props) {
  const [data, setData] = useState(initData);
  const [sel, setSel] = useState<CellPosition|null>(null);
  const [range, setRange] = useState<CellRange|null>(null);
  const [selMode, setSelMode] = useState<SelMode>("single");
  const [editing, setEditing] = useState<string|null>(null);
  const [editVal, setEditVal] = useState("");
  const [fBar, setFBar] = useState("");
  const [cw, setCw] = useState<Record<number, number>>({});
  const [sort, setSort] = useState<{ col: number; asc: boolean }|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (Object.keys(initData).length > 0) setData(initData); }, [initData]);
  const gCW = (c: number) => cw[c] || DEF_W;

  const getVal = useCallback((r: number, c: number) => {
    const k = cKey(r, c), cell = data[k];
    if (!cell) return "";
    return cell.formula ? evalFormula(cell.formula, data) : fmtVal(cell.value, cell.style?.format);
  }, [data]);

  const setV = useCallback((r: number, c: number, v: string) => {
    const k = cKey(r, c);
    setData(prev => {
      const next = { ...prev, [k]: { ...prev[k], value: v, formula: v.startsWith("=") ? v : undefined } };
      onDataChange?.(next);
      return next;
    });
  }, [onDataChange]);

  const applyStyle = useCallback((u: Partial<CellStyle>) => {
    if (!sel) return;
    const targets: CellPosition[] = [];
    if (selMode === "single") targets.push(sel);
    else if (selMode === "col") for (let r = 0; r < ROWS; r++) targets.push({ row: r, col: sel.col });
    else if (selMode === "row") for (let c = 0; c < COLS; c++) targets.push({ row: sel.row, col: c });
    else if (range) {
      const mr = Math.min(range.start.row, range.end.row), Mr = Math.max(range.start.row, range.end.row);
      const mc = Math.min(range.start.col, range.end.col), Mc = Math.max(range.start.col, range.end.col);
      for (let r = mr; r <= Mr; r++) for (let c = mc; c <= Mc; c++) targets.push({ row: r, col: c });
    }
    setData(prev => {
      const next = { ...prev };
      for (const p of targets) {
        const k = cKey(p.row, p.col);
        next[k] = { ...next[k], value: next[k]?.value || "", style: { ...next[k]?.style, ...u } };
      }
      onDataChange?.(next);
      return next;
    });
  }, [sel, selMode, range, ROWS, COLS, onDataChange]);

  const isSel = useCallback((r: number, c: number) => {
    if (!sel) return false;
    if (selMode === "single") return sel.row === r && sel.col === c;
    if (selMode === "col") return sel.col === c;
    if (selMode === "row") return sel.row === r;
    if (range) {
      const mr = Math.min(range.start.row, range.end.row), Mr = Math.max(range.start.row, range.end.row);
      const mc = Math.min(range.start.col, range.end.col), Mc = Math.max(range.start.col, range.end.col);
      return r >= mr && r <= Mr && c >= mc && c <= Mc;
    }
    return false;
  }, [sel, selMode, range]);

  const inRng = useCallback((r: number, c: number) => {
    if (selMode !== "range" || !range) return false;
    const mr = Math.min(range.start.row, range.end.row), Mr = Math.max(range.start.row, range.end.row);
    const mc = Math.min(range.start.col, range.end.col), Mc = Math.max(range.start.col, range.end.col);
    return r >= mr && r <= Mr && c >= mc && c <= Mc && !isSel(r, c);
  }, [selMode, range, isSel]);

  const clickCell = useCallback((r: number, c: number, shift: boolean) => {
    if (readOnly) return;
    if (shift && sel) { setSelMode("range"); setRange({ start: sel, end: { row: r, col: c } }); }
    else { setSel({ row: r, col: c }); setSelMode("single"); setRange(null); setFBar(data[cKey(r, c)]?.formula || data[cKey(r, c)]?.value || ""); }
  }, [sel, data, readOnly]);

  const dblClick = useCallback((r: number, c: number) => {
    if (readOnly) return;
    const k = cKey(r, c);
    setEditing(k);
    setEditVal(data[k]?.formula || data[k]?.value || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [data, readOnly]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (editing) {
      if (e.key === "Enter") { const p = parseKey(editing); setV(p.row, p.col, editVal); setEditing(null); if (p.row < ROWS - 1) setSel({ row: p.row + 1, col: p.col }); }
      else if (e.key === "Tab") { e.preventDefault(); const p = parseKey(editing); setV(p.row, p.col, editVal); setEditing(null); setSel({ row: p.row, col: Math.min(p.col + 1, COLS - 1) }); }
      else if (e.key === "Escape") setEditing(null);
      return;
    }
    if (!sel) return;
    const mv = (dr: number, dc: number) => setSel({ row: Math.max(0, Math.min(ROWS - 1, sel.row + dr)), col: Math.max(0, Math.min(COLS - 1, sel.col + dc)) });
    if (e.key === "Enter" && sel.row < ROWS - 1) { mv(1, 0); }
    else if (e.key === "Tab") { e.preventDefault(); mv(0, 1); }
    else if (e.key === "ArrowUp") mv(-1, 0);
    else if (e.key === "ArrowDown") mv(1, 0);
    else if (e.key === "ArrowLeft") mv(0, -1);
    else if (e.key === "ArrowRight") mv(0, 1);
    else if (e.key === "Delete" || e.key === "Backspace") setV(sel.row, sel.col, "");
    else if (e.key === "F2") dblClick(sel.row, sel.col);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { setEditing(cKey(sel.row, sel.col)); setEditVal(e.key); }
  }, [editing, editVal, sel, readOnly, setV, dblClick]);

  const doSort = useCallback((col: number) => setSort(prev => ({ col, asc: prev?.col === col ? !prev.asc : true })), []);

  const display = useMemo(() => {
    if (!sort) return data;
    const col = sort.col;
    const rows: { row: number; val: string }[] = [];
    for (let r = 0; r < ROWS; r++) rows.push({ row: r, val: data[cKey(r, col)]?.value || "" });
    rows.sort((a, b) => {
      const na = parseFloat(a.val), nb = parseFloat(b.val);
      if (!isNaN(na) && !isNaN(nb)) return sort.asc ? na - nb : nb - na;
      return sort.asc ? a.val.localeCompare(b.val) : b.val.localeCompare(a.val);
    });
    const nd: Record<string, CellData> = {};
    rows.forEach((item, nr) => { for (let c = 0; c < COLS; c++) { const ok = cKey(item.row, c); if (data[ok]) nd[cKey(nr, c)] = data[ok]; } });
    return nd;
  }, [data, sort]);

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden" tabIndex={0} onKeyDown={onKey}>
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
          <button onClick={() => sel && setV(sel.row, sel.col, "")} disabled={!sel} title="Effacer" className="w-7 h-7 rounded hover:bg-muted text-xs">Clr</button>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground px-2">{sheetName}</span>
        </div>
      )}
      {sel && !readOnly && (
        <div className="flex items-center gap-2 px-2 py-1 border-b bg-muted/20 shrink-0">
          <span className="text-xs font-mono font-medium w-10 text-center text-muted-foreground">{cKey(sel.row, sel.col)}</span>
          <input type="text" value={fBar} onChange={e => { setFBar(e.target.value); setV(sel.row, sel.col, e.target.value); }}
            className="flex-1 h-6 px-2 text-xs border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            placeholder="Valeur ou formule (ex: =SOMME(A1:A10))" />
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-muted border-b border-r w-10 h-7" />
              {Array.from({ length: COLS }, (_, col) => (
                <th key={col} className="sticky top-0 z-10 bg-muted border-b border-r text-[10px] font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none h-7"
                  style={{ width: gCW(col), minWidth: gCW(col) }}
                  onClick={() => { setSelMode("col"); setSel({ row: -1, col }); }}>
                  <div className="flex items-center justify-between px-1">
                    <span>{colLetter(col)}</span>
                    <button onClick={e => { e.stopPropagation(); doSort(col); }} className="text-[8px] hover:text-foreground" title="Trier">Sz</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, row) => (
              <tr key={row}>
                <td className="sticky left-0 z-10 bg-muted border-b border-r text-[10px] font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none text-center"
                  style={{ width: 40, height: DEF_H }}
                  onClick={() => { setSelMode("row"); setSel({ row, col: -1 }); }}>
                  {row + 1}
                </td>
                {Array.from({ length: COLS }, (_, col) => {
                  const k = cKey(row, col);
                  const cell = display[k];
                  const isEdit = editing === k;
                  const selected = isSel(row, col);
                  const inRange = inRng(row, col);
                  const st = cell?.style;
                  return (
                    <td key={col}
                      className={cn("border-b border-r relative overflow-hidden",
                        selected && "ring-2 ring-primary ring-inset z-10",
                        inRange && "bg-primary/5",
                        st?.bold && "font-bold", st?.italic && "italic", st?.underline && "underline")}
                      style={{ width: gCW(col), minWidth: gCW(col), height: DEF_H,
                        textAlign: st?.align || "left", backgroundColor: st?.bgColor || "transparent",
                        color: st?.textColor || "inherit", fontSize: st?.fontSize ? st.fontSize + "px" : "12px" }}
                      onClick={e => clickCell(row, col, e.shiftKey)}
                      onDoubleClick={() => dblClick(row, col)}>
                      {isEdit ? (
                        <input ref={inputRef} type="text" value={editVal} onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { setV(row, col, editVal); setEditing(null); } else if (e.key === "Escape") setEditing(null); }}
                          onBlur={() => { setV(row, col, editVal); setEditing(null); }}
                          className="absolute inset-0 w-full h-full px-1 text-xs border-none outline-none bg-white font-mono z-20" />
                      ) : (
                        <span className="block px-1 truncate text-xs">{getVal(row, col)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
