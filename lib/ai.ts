import Anthropic from "@anthropic-ai/sdk";

// --------------------------------------------------------------------------
// Service IA — Claude API pour l'analyse et la generation
// --------------------------------------------------------------------------

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY manquant");
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
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
  const ai = getClient();

  const response = await ai.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `Tu es un expert en montage de projets pour les ONG internationales. Analyse cet appel d'offres et extrais les informations suivantes en francais.

APPEL D'OFFRES :
${texte}

Reponds EXACTEMENT dans ce format JSON (sans markdown, juste le JSON) :
{
  "criteres": "Liste des criteres d'evaluation (un par ligne)",
  "exigences": "Liste des exigences techniques et administratives (un par ligne)",
  "documentsRequis": "Liste des documents a fournir (un par ligne)",
  "budgetEstime": "Budget mentionne ou estime",
  "recommandations": "5 recommandations strategiques pour maximiser les chances de selection"
}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extraire le JSON de la reponse
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // Si le parsing echoue, retourner le texte brut
  }

  return {
    criteres: text,
    exigences: "",
    documentsRequis: "",
    budgetEstime: "",
    recommandations: "",
  };
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
  const ai = getClient();

  const response = await ai.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [{
      role: "user",
      content: `Tu es un expert en redaction de projets pour les ONG. Genere le contenu d'un document de type "${params.typeDocument}" pour le projet suivant.

PROJET : ${params.titreProjet}
BAILLEUR : ${params.bailleur}
DESCRIPTION : ${params.description}
${params.analyseIA ? `\nANALYSE DE L'APPEL D'OFFRES :\n${params.analyseIA}` : ""}

Redige un contenu professionnel, structure avec des titres et sous-titres, pret a etre utilise dans une proposition technique. Le contenu doit etre detaille et adapte au contexte du Tchad et de l'ONG CHADIA.

Utilise un style formel, professionnel, adapte aux bailleurs internationaux.`
    }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

/**
 * Verifie la conformite d'un document par rapport aux exigences.
 */
export async function verifierConformite(params: {
  contenuDocument: string;
  exigences: string;
}): Promise<{ score: number; problemes: string; suggestions: string }> {
  const ai = getClient();

  const response = await ai.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Tu es un evaluateur de propositions pour un bailleur international. Evalue la conformite de ce document par rapport aux exigences.

DOCUMENT :
${params.contenuDocument.slice(0, 5000)}

EXIGENCES :
${params.exigences}

Reponds en JSON :
{
  "score": [0-100],
  "problemes": "Liste des problemes identifies",
  "suggestions": "Suggestions d'amelioration"
}`
    }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch { /* fallback */ }

  return { score: 0, problemes: text, suggestions: "" };
}
