/**
 * Prompt pour auto-distribuer les keyQuestions vers les sections.
 * Appelé une seule fois lors de la création du projet via from-tdr.
 */

export const KEY_QUESTION_MAPPER_SYSTEM = `Tu es un expert en montage de projets de développement. Tu dois mapper chaque question stratégique à la section de proposition la plus pertinente. Réponds UNIQUEMENT en JSON valide.`;

export function buildKeyQuestionMapperPrompt(
  sections: Array<{ id: string; title: string }>,
  keyQuestions: string[]
): string {
  return `Pour chaque question stratégique ci-dessous, identifie LA section requise la plus pertinente où la réponse devra être mobilisée dans la rédaction.

SECTIONS DISPONIBLES :
${sections.map(s => `- ${s.id}: ${s.title}`).join("\n")}

QUESTIONS :
${keyQuestions.map((q, i) => `${i}: ${q}`).join("\n")}

Réponds en JSON strict :
{ "mappings": [{ "questionIndex": 0, "sectionId": "..." }, ...] }

Chaque question doit être mappée à exactement UNE section. Utilise les IDs exacts des sections ci-dessus.`;
}
