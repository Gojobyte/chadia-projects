import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import HTMLtoDOCX from "html-to-docx";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { projet: { select: { titre: true, bailleur: { select: { sigle: true } } } } },
  });

  if (!doc) return new Response("Document introuvable", { status: 404 });

  const htmlContent = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: Arial, sans-serif; font-size: 12pt; color: #1e293b; line-height: 1.6;">
        <h1 style="font-size: 18pt; color: #0f172a; margin-bottom: 4px;">${doc.titre}</h1>
        <p style="font-size: 10pt; color: #64748b; margin-bottom: 24px;">
          ${doc.projet.titre} — ${doc.projet.bailleur.sigle}
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
        ${doc.contenu ?? "<p>Document vide</p>"}
      </body>
    </html>
  `;

  const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });

  const fileName = `${doc.titre.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçæœ\s-]/g, "").replace(/\s+/g, "_")}.docx`;

  const buf = Buffer.from(docxBuffer as Buffer);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
