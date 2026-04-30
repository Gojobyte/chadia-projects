import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import mammoth from "mammoth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return Response.json({ error: "Document introuvable" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return Response.json({ error: "Aucun fichier fourni" }, { status: 400 });

  const fileName = file.name.toLowerCase();
  let html = "";

  if (fileName.endsWith(".docx")) {
    // Convertir DOCX → HTML avec mammoth
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h2:fresh",
        "p[style-name='Heading 2'] => h3:fresh",
        "p[style-name='Heading 3'] => h4:fresh",
      ],
    });
    html = result.value;
  } else if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
    // Lire le HTML directement
    html = await file.text();
    // Extraire juste le body si c'est un document HTML complet
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    // Texte brut → envelopper dans des paragraphes
    const text = await file.text();
    html = text.split("\n\n").map(p => {
      p = p.trim();
      if (!p) return "";
      if (p.startsWith("# ")) return `<h2>${p.slice(2)}</h2>`;
      if (p.startsWith("## ")) return `<h3>${p.slice(3)}</h3>`;
      if (p.startsWith("### ")) return `<h4>${p.slice(4)}</h4>`;
      return `<p>${p}</p>`;
    }).join("\n");
  } else {
    return Response.json({ error: "Format non supporté. Utilisez .docx, .html ou .txt" }, { status: 400 });
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
