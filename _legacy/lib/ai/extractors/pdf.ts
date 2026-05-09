/**
 * Extracteur PDF — extrait le texte brut d'un fichier PDF.
 *
 * Utilise pdf-parse pour les PDF natifs (texte sélectionnable).
 * Limite à 100 pages / 200k caractères pour éviter les dépassements de tokens.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const MAX_PAGES = 100;
const MAX_CHARS = 200_000;

interface PDFExtractionResult {
  text: string;
  pageCount: number;
  truncated: boolean;
  fileName: string;
}

export async function extractTextFromPDF(
  buffer: Buffer,
  fileName: string
): Promise<PDFExtractionResult> {
  const data = await pdfParse(buffer, {
    max: MAX_PAGES,
  });

  let text = data.text;
  const truncated = text.length > MAX_CHARS;

  if (truncated) {
    text = text.slice(0, MAX_CHARS) + "\n\n[... document tronqué à 200 000 caractères ...]";
  }

  return {
    text: text.trim(),
    pageCount: data.numpages,
    truncated,
    fileName,
  };
}
