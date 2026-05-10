import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import mammoth from "mammoth";

/**
 * Règles de mapping mammoth : on dit à mammoth comment convertir
 * chaque style Word en balise HTML.
 *
 * Par exemple, "p[style-name='Heading 1'] => h1:fresh" signifie :
 * "quand tu rencontres un paragraphe avec le style 'Heading 1',
 *  transforme-le en balise <h1>".
 *
 * ":fresh" veut dire "crée une nouvelle balise à chaque fois"
 * (au lieu de fusionner avec la précédente).
 */
const MAMMOTH_STYLE_MAP = [
  // --- Titres (Headings) ---
  // Word utilise des noms de style comme "Heading 1", "Heading 2", etc.
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  // Versions françaises (certains Word francophones)
  "p[style-name='Titre 1'] => h1:fresh",
  "p[style-name='Titre 2'] => h2:fresh",
  "p[style-name='Titre 3'] => h3:fresh",
  "p[style-name='Titre 4'] => h4:fresh",

  // --- Mise en forme du texte (inline) ---
  // Bold = gras → <strong>
  "b => strong",
  // Italic = italique → <em>
  "i => em",
  // Underline = souligné → <u>
  "u => u",
  // Strikethrough = barré → <s>
  "strike => s",

  // --- Listes ---
  // Listes à puces (unordered)
  "p[style-name='List Bullet'] => ul > li:fresh",
  "p[style-name='List Bullet 2'] => ul > li:fresh",
  "p[style-name='List Bullet 3'] => ul > li:fresh",
  // Versions françaises
  "p[style-name='Liste à puces'] => ul > li:fresh",
  "p[style-name='Liste à puces 2'] => ul > li:fresh",

  // Listes numérotées (ordered)
  "p[style-name='List Number'] => ol > li:fresh",
  "p[style-name='List Number 2'] => ol > li:fresh",
  "p[style-name='List Number 3'] => ol > li:fresh",
  // Versions françaises
  "p[style-name='Liste numérotée'] => ol > li:fresh",

  // Liste par défaut (List Paragraph) → on la traite comme une puce
  "p[style-name='List Paragraph'] => ul > li:fresh",

  // --- Styles spéciaux ---
  // Citations
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  "p[style-name='Citation'] => blockquote > p:fresh",

  // Titre du document
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Titre'] => h1.doc-title:fresh",
  "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
  "p[style-name='Sous-titre'] => p.doc-subtitle:fresh",

  // --- Tableaux ---
  // Les cellules de tableau sont gérées automatiquement par mammoth,
  // mais on peut mapper les styles de cellule si besoin
  "p[style-name='Normal'] => p:fresh",
];

/**
 * Post-traitement du HTML généré par mammoth.
 *
 * Mammoth génère un HTML assez "brut" — pas de styles sur les tableaux,
 * des paragraphes vides, etc. Cette fonction nettoie et embellit le résultat
 * pour que ça ressemble mieux au document original dans l'éditeur.
 */
function postProcessHtml(html: string): string {
  let result = html;

  // 1. Supprimer les paragraphes vides (juste <p></p> ou <p> </p>)
  // Regex : on cherche <p> suivi de rien ou d'espaces, puis </p>
  result = result.replace(/<p>\s*<\/p>/gi, "");

  // 2. Ajouter des styles aux tableaux pour qu'ils soient visibles
  // Sans ça, les tableaux n'ont pas de bordures dans l'éditeur
  result = result.replace(
    /<table>/gi,
    '<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">'
  );

  // 3. Styler les cellules de tableau (td et th)
  // On ajoute bordure, padding et alignement vertical
  result = result.replace(
    /<td>/gi,
    '<td style="border: 1px solid #d1d5db; padding: 8px 12px; vertical-align: top;">'
  );
  result = result.replace(
    /<th>/gi,
    '<th style="border: 1px solid #d1d5db; padding: 8px 12px; vertical-align: top; font-weight: bold; background-color: #f3f4f6;">'
  );

  // 4. Aussi gérer les td/th qui ont déjà des attributs (colspan, rowspan, etc.)
  result = result.replace(
    /<td(\s+[^>]*?)>/gi,
    '<td$1 style="border: 1px solid #d1d5db; padding: 8px 12px; vertical-align: top;">'
  );
  result = result.replace(
    /<th(\s+[^>]*?)>/gi,
    '<th$1 style="border: 1px solid #d1d5db; padding: 8px 12px; vertical-align: top; font-weight: bold; background-color: #f3f4f6;">'
  );

  // 5. Styler les lignes de tableau (tr) pour l'alternance de couleurs
  // On ne peut pas faire du zebra-striping facilement en regex,
  // mais on ajoute au moins un style de base sur les <tr>
  result = result.replace(
    /<tr>/gi,
    '<tr style="border-bottom: 1px solid #e5e7eb;">'
  );

  // 6. Styler les titres pour qu'ils aient des tailles cohérentes
  result = result.replace(
    /<h1(?:\s+[^>]*)?>/gi,
    '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; color: #111827;">'
  );
  result = result.replace(
    /<h2(?:\s+[^>]*)?>/gi,
    '<h2 style="font-size: 20px; font-weight: bold; margin: 18px 0 8px 0; color: #1f2937;">'
  );
  result = result.replace(
    /<h3(?:\s+[^>]*)?>/gi,
    '<h3 style="font-size: 17px; font-weight: bold; margin: 16px 0 6px 0; color: #374151;">'
  );
  result = result.replace(
    /<h4(?:\s+[^>]*)?>/gi,
    '<h4 style="font-size: 15px; font-weight: bold; margin: 14px 0 4px 0; color: #4b5563;">'
  );

  // 7. Styler les blockquotes (citations)
  result = result.replace(
    /<blockquote>/gi,
    '<blockquote style="border-left: 4px solid #9ca3af; margin: 12px 0; padding: 8px 16px; color: #6b7280; font-style: italic;">'
  );

  // 8. Styler les listes pour un meilleur espacement
  result = result.replace(
    /<ul>/gi,
    '<ul style="margin: 8px 0; padding-left: 24px; list-style-type: disc;">'
  );
  result = result.replace(
    /<ol>/gi,
    '<ol style="margin: 8px 0; padding-left: 24px; list-style-type: decimal;">'
  );

  // 9. Ajouter un espacement sur les paragraphes
  result = result.replace(
    /<p>/gi,
    '<p style="margin: 6px 0; line-height: 1.6;">'
  );

  // 10. Nettoyer les <br> multiples consécutifs (plus de 2)
  result = result.replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />");

  return result;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc)
    return Response.json({ error: "Document introuvable" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file)
    return Response.json({ error: "Aucun fichier fourni" }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let html = "";

  if (fileName.endsWith(".docx")) {
    // Convertir DOCX → HTML avec mammoth + nos règles de style
    const buffer = Buffer.from(await file.arrayBuffer());
    const conversionResult = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: MAMMOTH_STYLE_MAP,
        // Dire à mammoth de garder les images en base64 (inline)
        convertImage: mammoth.images.imgElement(function (image) {
          return image.read("base64").then(function (imageBuffer) {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
            };
          });
        }),
      }
    );

    // On récupère le HTML brut, puis on le post-traite
    html = postProcessHtml(conversionResult.value);

    // Log des avertissements mammoth (utile pour débugger)
    if (conversionResult.messages.length > 0) {
      console.warn(
        "[Import DOCX] Avertissements mammoth:",
        conversionResult.messages.map((m) => m.message)
      );
    }
  } else if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
    // Lire le HTML directement
    html = await file.text();
    // Extraire juste le body si c'est un document HTML complet
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    // Texte brut → envelopper dans des paragraphes
    const text = await file.text();
    html = text
      .split("\n\n")
      .map((p) => {
        p = p.trim();
        if (!p) return "";
        if (p.startsWith("### ")) return `<h3>${p.slice(4)}</h3>`;
        if (p.startsWith("## ")) return `<h3>${p.slice(3)}</h3>`;
        if (p.startsWith("# ")) return `<h2>${p.slice(2)}</h2>`;
        return `<p>${p}</p>`;
      })
      .join("\n");
  } else {
    return Response.json(
      { error: "Format non supporté. Utilisez .docx, .html ou .txt" },
      { status: 400 }
    );
  }

  // Sauvegarder le contenu importé
  await prisma.document.update({
    where: { id },
    data: {
      contenu: html,
      statut: doc.statut === "BROUILLON" ? "REDACTION" : doc.statut,
    },
  });

  return Response.json({ html, message: "Document importé avec succès" });
}
