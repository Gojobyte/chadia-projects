import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const body = await request.json();
  const { action, context, selection } = body as {
    action: "continuer" | "ameliorer" | "resumer" | "developper" | "traduire" | "titres" | "custom";
    context?: string;
    selection?: string;
  };

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { projet: { select: { titre: true, description: true, bailleur: { select: { sigle: true, nom: true } } } } },
  });

  if (!doc) return Response.json({ error: "Document introuvable" }, { status: 404 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "GEMINI_API_KEY manquant" }, { status: 500 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const projectContext = `Projet: ${doc.projet.titre}\nBailleur: ${doc.projet.bailleur.sigle} (${doc.projet.bailleur.nom})\nDescription: ${doc.projet.description}\nDocument: ${doc.titre} (${doc.categorie})`;

  const prompts: Record<string, string> = {
    continuer: `Tu es un expert en rédaction de projets pour les ONG internationales. Continue la rédaction du document suivant. Écris la suite logique du contenu en gardant le même style et ton professionnel.

${projectContext}

Contenu actuel du document (les derniers paragraphes) :
${context?.slice(-2000) ?? "Document vide"}

Continue la rédaction avec 2-3 paragraphes. Écris directement le contenu en HTML (avec <p>, <strong>, <ul>, <li>, <h2> si nécessaire). Pas de markdown. Pas d'explication, juste le contenu.`,

    ameliorer: `Tu es un expert en rédaction de projets pour les ONG. Améliore le texte suivant : rends-le plus professionnel, plus précis, et mieux structuré pour un bailleur international.

${projectContext}

Texte à améliorer :
${selection ?? context?.slice(-1500) ?? ""}

Réécris le texte amélioré en HTML (<p>, <strong>, etc.). Pas de markdown. Juste le contenu amélioré.`,

    resumer: `Résume le texte suivant en 2-3 phrases clés, de manière concise et professionnelle.

${selection ?? context?.slice(-2000) ?? ""}

Réponds en HTML (<p>). Pas de markdown.`,

    developper: `Tu es un expert en montage de projets ONG. Développe et détaille le texte suivant avec plus d'arguments, de données et d'exemples pertinents pour le contexte africain.

${projectContext}

Texte à développer :
${selection ?? context?.slice(-1500) ?? ""}

Développe en 3-4 paragraphes détaillés en HTML (<p>, <strong>, <ul>, <li>). Pas de markdown.`,

    titres: `Génère une structure de plan (titres et sous-titres) pour ce type de document dans le contexte d'un appel d'offres.

${projectContext}

Génère 6-8 sections avec des titres en HTML (<h2>) et un court paragraphe placeholder (<p>) pour chacune. Adapté au bailleur ${doc.projet.bailleur.sigle}. Pas de markdown.`,

    custom: `Tu es un expert en rédaction de projets pour les ONG. ${context ?? "Aide-moi avec ce document."}

${projectContext}

Contenu actuel :
${doc.contenu?.slice(-2000) ?? "Document vide"}

Réponds en HTML (<p>, <h2>, <strong>, <ul>, <li> si nécessaire). Pas de markdown, pas d'explication.`,
  };

  const prompt = prompts[action] ?? prompts.custom;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Nettoyer — enlever les backticks markdown si présents
    let html = text.replace(/```html\n?/g, "").replace(/```\n?/g, "").trim();

    // Si le résultat n'est pas du HTML, l'envelopper dans <p>
    if (!html.startsWith("<")) {
      html = html.split("\n\n").map(p => `<p>${p.trim()}</p>`).join("\n");
    }

    return Response.json({ suggestion: html });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur IA";
    return Response.json({ error: msg }, { status: 500 });
  }
}
