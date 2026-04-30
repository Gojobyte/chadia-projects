import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import HTMLtoDOCX from "html-to-docx";

/**
 * Génère la date du jour au format français.
 * Exemple : "30 avril 2026"
 */
function getFormattedDate(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Extrait les titres (h1, h2, h3) du contenu HTML pour construire
 * un sommaire automatique (table des matières).
 *
 * On utilise une regex pour trouver les balises <h1>, <h2>, <h3>
 * et on récupère le texte qu'elles contiennent.
 */
function extractHeadings(
  html: string
): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  // Cette regex capture : le niveau (1, 2 ou 3) et le contenu texte
  const regex = /<h([1-3])(?:\s[^>]*)?>(.+?)<\/h[1-3]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // match[1] = le chiffre du heading (1, 2, 3)
    // match[2] = le contenu texte (peut contenir d'autres balises)
    const text = match[2].replace(/<[^>]*>/g, ""); // on enlève les balises internes
    headings.push({ level: parseInt(match[1], 10), text });
  }
  return headings;
}

/**
 * Génère le HTML du sommaire (table des matières).
 * Chaque titre est indenté selon son niveau (h1, h2, h3).
 */
function buildTableOfContents(
  headings: Array<{ level: number; text: string }>
): string {
  if (headings.length === 0) return "";

  const tocItems = headings
    .map((h) => {
      // Indentation : h1 = 0px, h2 = 20px, h3 = 40px
      const indent = (h.level - 1) * 20;
      const fontSize = h.level === 1 ? "12pt" : "11pt";
      const fontWeight = h.level === 1 ? "bold" : "normal";
      return `<p style="margin: 4px 0; padding-left: ${indent}px; font-size: ${fontSize}; font-weight: ${fontWeight}; color: #1e293b;">${h.text}</p>`;
    })
    .join("\n");

  return `
    <div style="margin: 24px 0 32px 0; padding: 16px 20px; border: 1px solid #e2e8f0; border-radius: 4px;">
      <h2 style="font-size: 14pt; font-weight: bold; color: #0f172a; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Sommaire</h2>
      ${tocItems}
    </div>
  `;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      projet: {
        select: { titre: true, bailleur: { select: { sigle: true, nom: true } } },
      },
    },
  });

  if (!doc) return new Response("Document introuvable", { status: 404 });

  const dateStr = getFormattedDate();
  const contenu = doc.contenu ?? "<p>Document vide</p>";
  const headings = extractHeadings(contenu);
  const toc = buildTableOfContents(headings);

  // --- Construction du HTML complet pour le DOCX ---
  // html-to-docx prend un string HTML et le convertit en fichier Word.
  // On construit un HTML "riche" avec :
  //   1. Une page de couverture
  //   2. Un sommaire (table des matières)
  //   3. Le contenu du document

  const htmlContent = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6;">

        <!-- ========== PAGE DE COUVERTURE ========== -->
        <!-- C'est la première page du document exporté.
             Elle donne un aspect professionnel avec le nom de l'ONG,
             le titre du document, le projet, le bailleur et la date. -->
        <div style="text-align: center; padding-top: 120px; padding-bottom: 60px;">

          <!-- Nom de l'organisation -->
          <p style="font-size: 14pt; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px;">
            ONG CHADIA
          </p>

          <!-- Ligne décorative -->
          <hr style="border: none; border-top: 3px solid #2563eb; width: 120px; margin: 16px auto;" />

          <!-- Titre du document (le plus gros texte de la page) -->
          <h1 style="font-size: 26pt; font-weight: bold; color: #0f172a; margin: 32px 0 16px 0; line-height: 1.3;">
            ${doc.titre}
          </h1>

          <!-- Nom du projet -->
          <p style="font-size: 13pt; color: #475569; margin: 12px 0 4px 0;">
            Projet : <strong>${doc.projet.titre}</strong>
          </p>

          <!-- Bailleur (organisme qui finance) -->
          <p style="font-size: 12pt; color: #64748b; margin: 4px 0 40px 0;">
            Bailleur : ${doc.projet.bailleur.nom || doc.projet.bailleur.sigle}
          </p>

          <!-- Ligne décorative -->
          <hr style="border: none; border-top: 1px solid #cbd5e1; width: 200px; margin: 24px auto;" />

          <!-- Date -->
          <p style="font-size: 11pt; color: #94a3b8; margin-top: 16px;">
            ${dateStr}
          </p>
        </div>

        <!-- Saut de page après la couverture -->
        <br clear="all" style="page-break-after: always;" />

        <!-- ========== SOMMAIRE ========== -->
        <!-- Généré automatiquement à partir des titres h1/h2/h3 du contenu -->
        ${toc}

        ${headings.length > 0 ? '<br clear="all" style="page-break-after: always;" />' : ""}

        <!-- ========== CONTENU DU DOCUMENT ========== -->
        <div style="font-size: 11pt; line-height: 1.7; color: #1e293b;">
          ${contenu}
        </div>

      </body>
    </html>
  `;

  // --- En-tête du document (affiché en haut de chaque page) ---
  const headerHtml = `
    <p style="font-size: 8pt; color: #94a3b8; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
      ONG CHADIA — ${doc.titre}
    </p>
  `;

  // --- Conversion HTML → DOCX ---
  // Les options contrôlent la mise en page du document Word
  const docxBuffer = await HTMLtoDOCX(htmlContent, headerHtml, {
    // Marges de la page (en millimètres)
    // C'est l'espace entre le bord de la feuille et le contenu
    margins: {
      top: 1440,    // ~2.54 cm (1 inch) — en twips (1440 twips = 1 pouce)
      right: 1440,
      bottom: 1440,
      left: 1440,
    },
    // Configuration des tableaux
    table: {
      row: {
        cantSplit: true, // Empêche une ligne de tableau d'être coupée entre 2 pages
      },
    },
    // Activer le pied de page
    footer: true,
    // Activer les numéros de page (en bas de chaque page)
    pageNumber: true,
    // Orientation portrait (par défaut)
    orientation: "portrait",
    // Taille de police par défaut
    fontSize: 22, // En demi-points : 22 = 11pt
    // Police par défaut
    font: "Calibri",
    // Titre du document (métadonnées du fichier Word)
    title: doc.titre,
    // Sujet
    subject: `${doc.projet.titre} — ${doc.projet.bailleur.sigle}`,
    // Créateur
    creator: "ONG CHADIA",
    // Description
    description: `Document exporté le ${dateStr}`,
  });

  // --- Préparer le nom du fichier ---
  // On enlève les caractères spéciaux et on remplace les espaces par des underscores
  const fileName = `${doc.titre
    .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçæœÀÂÄÉÈÊËÏÎÔÙÛÜŸÇÆŒ\s-]/g, "")
    .replace(/\s+/g, "_")}.docx`;

  // --- Renvoyer le fichier en réponse ---
  const buf = Buffer.from(docxBuffer as Buffer);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
