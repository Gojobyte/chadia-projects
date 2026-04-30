import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------------------------------
// Service IA — Google Gemini (GRATUIT)
// --------------------------------------------------------------------------

let genAI: GoogleGenerativeAI | null = null;

function getAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY manquant");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Analyse un appel d'offres et extrait les informations cles.
 */
export async function analyserAppelOffre(texte: string): Promise<{
  criteres: string;
  exigences: string;
  documentsRequis: string;
  budgetEstime: string;
  recommandations: string;
}> {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(`Tu es un expert en montage de projets pour les ONG internationales. Analyse cet appel d'offres et extrais les informations suivantes en francais.

APPEL D'OFFRES :
${texte}

Reponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks) :
{
  "criteres": "Liste des criteres d'evaluation (un par ligne)",
  "exigences": "Liste des exigences techniques et administratives (un par ligne)",
  "documentsRequis": "Liste des documents a fournir (un par ligne)",
  "budgetEstime": "Budget mentionne ou estime",
  "recommandations": "5 recommandations strategiques pour maximiser les chances de selection"
}`);

  const text = result.response.text();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }

  return { criteres: text, exigences: "", documentsRequis: "", budgetEstime: "", recommandations: "" };
}

/**
 * Genere le contenu d'un document a partir du contexte du projet.
 */
export async function genererContenu(params: {
  typeDocument: string;
  titreProjet: string;
  bailleur: string;
  description: string;
  analyseIA?: string;
}): Promise<string> {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(`Tu es un expert en redaction de projets pour les ONG. Genere le contenu d'un document de type "${params.typeDocument}" pour le projet suivant.

PROJET : ${params.titreProjet}
BAILLEUR : ${params.bailleur}
DESCRIPTION : ${params.description}
${params.analyseIA ? `\nANALYSE DE L'APPEL D'OFFRES :\n${params.analyseIA}` : ""}

Redige un contenu professionnel, structure avec des titres et sous-titres, pret a etre utilise dans une proposition technique. Le contenu doit etre detaille et adapte au contexte du Tchad et de l'ONG CHADIA.
Style formel, professionnel, adapte aux bailleurs internationaux.`);

  return result.response.text();
}

/**
 * Verifie la conformite d'un document par rapport aux exigences.
 */
export async function verifierConformite(params: {
  contenuDocument: string;
  exigences: string;
}): Promise<{ score: number; problemes: string; suggestions: string }> {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent(`Evalue la conformite de ce document par rapport aux exigences. Reponds UNIQUEMENT en JSON valide :

DOCUMENT :
${params.contenuDocument.slice(0, 5000)}

EXIGENCES :
${params.exigences}

{
  "score": [0-100],
  "problemes": "Liste des problemes",
  "suggestions": "Suggestions d'amelioration"
}`);

  const text = result.response.text();
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }

  return { score: 0, problemes: text, suggestions: "" };
}
