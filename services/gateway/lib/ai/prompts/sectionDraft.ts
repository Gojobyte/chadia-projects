/**
 * Prompt pour générer un brouillon de section basé sur les réponses Q&A.
 */

export const SECTION_DRAFT_SYSTEM = `Tu es un rédacteur expert en propositions de projets de développement international. Tu rédiges en français professionnel, registre soutenu, sans superlatifs creux. Tu produis du HTML compatible avec un éditeur rich text (<p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>). PAS de markdown.`;

export function buildSectionDraftPrompt(params: {
  sectionTitle: string;
  sectionDescription: string;
  donorName: string;
  qaPairs: Array<{ question: string; answer: string }>;
  relevantKeyQuestions: Array<{ question: string; answer: string }>;
  existingContent: string;
  maxPages: number | null;
  evaluationKeywords: string[];
}): string {
  return `Tu rédiges la section "${params.sectionTitle}" d'une proposition pour ${params.donorName}.

DESCRIPTION DE LA SECTION (cahier des charges du bailleur) :
${params.sectionDescription}

RÉPONSES DE L'UTILISATEUR AUX QUESTIONS STRUCTURANTES DE CETTE SECTION :
${params.qaPairs.map(qa =>
    `Q: ${qa.question}\nR: ${qa.answer}`
  ).join("\n\n")}

${params.relevantKeyQuestions.length > 0 ? `
RÉPONSES STRATÉGIQUES PERTINENTES DU PROJET (niveau global) :
${params.relevantKeyQuestions.map(qa =>
    `Q: ${qa.question}\nR: ${qa.answer}`
  ).join("\n\n")}
` : ""}

${params.existingContent.trim().length > 0 ? `
CONTENU DÉJÀ RÉDIGÉ DANS CETTE SECTION (à compléter, pas à remplacer) :
${params.existingContent}
` : ""}

CONTRAINTES :
- Texte en français professionnel, registre soutenu
- ${params.maxPages ? `Section limitée à ${params.maxPages} pages environ` : "Pas de limite stricte"}
- Mobilise naturellement les réponses de l'utilisateur (ne pas les citer telles quelles)
- Inclus les concepts évaluatifs suivants quand pertinent : ${params.evaluationKeywords.join(", ")}
- Ton : factuel, démonstratif, chiffré quand possible
- Format : HTML pour l'éditeur (<p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>)
- PAS de markdown, PAS de balises <html>/<body>/<head>

Si une réponse de l'utilisateur est trop floue ou manquante, NE PAS inventer.
Indique entre crochets [À COMPLÉTER : description de ce qui manque] pour signaler à l'utilisateur.

Renvoie UNIQUEMENT le contenu HTML, sans préambule.`;
}
