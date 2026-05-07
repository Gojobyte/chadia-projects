import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Editor types & constants ───

export type FontFamily = "Inter" | "Arial" | "Times New Roman" | "Courier New" | "Georgia" | "Verdana";
export type FontSize = "8" | "9" | "10" | "11" | "12" | "14" | "16" | "18" | "20" | "24" | "28" | "32" | "36" | "48" | "72";
export type LineSpacing = "1" | "1.15" | "1.5" | "2" | "2.5" | "3";

export const FONT_FAMILIES: { value: FontFamily; label: string }[] = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
];

export const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
  { value: "14", label: "14" },
  { value: "16", label: "16" },
  { value: "18", label: "18" },
  { value: "20", label: "20" },
  { value: "24", label: "24" },
  { value: "28", label: "28" },
  { value: "32", label: "32" },
  { value: "36", label: "36" },
  { value: "48", label: "48" },
  { value: "72", label: "72" },
];

export const LINE_SPACINGS: { value: LineSpacing; label: string }[] = [
  { value: "1", label: "Simple" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "Double" },
  { value: "2.5", label: "2.5" },
  { value: "3", label: "Triple" },
];
