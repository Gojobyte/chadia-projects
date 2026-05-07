"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  data: object[];
  filename?: string;
  type?: "pdf" | "excel" | "csv";
  onExport?: (type: "pdf" | "excel" | "csv") => void;
  className?: string;
}

export function ExportButton({
  data,
  filename = "export",
  type,
  onExport,
  className,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (exportType: "pdf" | "excel" | "csv") => {
    setIsExporting(true);
    try {
      switch (exportType) {
        case "csv":
          exportCSV(data, filename);
          break;
        case "excel":
          exportExcel(data, filename);
          break;
        case "pdf":
          exportPDF(data, filename);
          break;
      }
      onExport?.(exportType);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || data.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <LoadingSpinner /> Export...
          </>
        ) : (
          <>📥 Exporter</>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 rounded-md border bg-card shadow-lg z-50 min-w-[160px]">
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors rounded-t-md"
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors"
          >
            📊 Export Excel
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors rounded-b-md"
          >
            📋 Export CSV
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  );
}

// ─── Export helpers (client-side) ───

function exportCSV(data: object[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((row) =>
      headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        const str = String(val ?? "");
        // Escape semicolons and quotes
        return str.includes(";") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(";")
    ),
  ];
  downloadFile(csvRows.join("\n"), `${filename}.csv`, "text/csv;charset=utf-8;");
}

function exportExcel(data: object[], filename: string) {
  // Generate a simple HTML table that Excel can open
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>td{mso-number-format:"\\@"}</style></head>
    <body><table border="1">
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>
        ${data.map((row) => `<tr>${headers.map((h) => `<td>${(row as Record<string, unknown>)[h] ?? ""}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table></body></html>
  `;
  downloadFile(html, `${filename}.xls`, "application/vnd.ms-excel");
}

function exportPDF(data: object[], filename: string) {
  // Open a print-friendly window
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>${filename}</title>
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; color: #1a1a1a; }
      h1 { font-size: 18px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #f5f5f5; padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd; }
      td { padding: 6px 12px; border-bottom: 1px solid #eee; }
      tr:hover { background: #fafafa; }
      .footer { margin-top: 20px; font-size: 10px; color: #888; }
      @media print { body { padding: 0; } }
    </style></head>
    <body>
      <h1>${filename}</h1>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${data.map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(String((row as Record<string, unknown>)[h] ?? ""))}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
      <div class="footer">
        Exporté le ${new Date().toLocaleDateString("fr-FR")} — CHADIA Platform
      </div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
