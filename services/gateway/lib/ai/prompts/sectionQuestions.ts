/**
 * Prompt pour générer les questions guidées par section.
 * Calibré sur le contexte TDR du projet.
 */

export const SECTION_QUESTIONS_SYSTEM = `Tu es un expert senior en montage de projets de développement international. Tu génères des questions structurantes pour guider la rédaction d'une section de proposition. Réponds UNIQUEMENT en JSON valide.`;

export function buildSectionQuestionsPrompt(params: {
  sectionTitle: string;
  sectionDescription: string;
  donorName: string;
  donorProgram: string | null;
  evaluationCriteria: Array<{ name: string; weight: number; subcriteria: string[] }>;
  eligibility: { sectors: string[]; countries: string[] };
  crossCutting: { genderMarker?: number | null; doNoHarm?: boolean; nexusApproach?: boolean };
}): string {
  const markers = [
    params.crossCutting.genderMarker === 2 ? "Genre transformateur (CAD-OCDE niveau 2)" : null,
    params.crossCutting.doNoHarm ? "Do No Harm" : null,
    params.crossCutting.nexusApproach ? "Approche NEXUS" : null,
  ].filter(Boolean).join(", ");

  return `Tu dois générer 5 à 8 questions structurantes que l'utilisateur doit répondre pour rédiger une excellente section "${params.sectionTitle}" dans une proposition pour ${params.donorName}${params.donorProgram ? ` (${params.donorProgram})` : ""}.

CONTEXTE DU PROJET :
- Bailleur : ${params.donorName}
- Programme : ${params.donorProgram ?? "Non spécifié"}
- Pays : ${params.eligibility.countries.join(", ")}
- Secteurs : ${params.eligibility.sectors.join(", ")}
- Marqueurs transversaux : ${markers || "Aucun spécifié"}

DESCRIPTION DE LA SECTION (extraite du TDR du bailleur) :
${params.sectionDescription}

CRITÈRES D'ÉVALUATION DU TDR :
${params.evaluationCriteria.map(c =>
    `- ${c.name} (${c.weight}%) : ${c.subcriteria.join(", ")}`
  ).join("\n")}

RÈGLES :
1. Les questions doivent être SPÉCIFIQUES au contexte ci-dessus. Mentionne le bailleur, le secteur, le pays, les marqueurs quand pertinent.
2. Chaque question doit aider à couvrir un aspect évalué par les critères d'évaluation.
3. Questions ouvertes (pas oui/non), entre 80 et 250 caractères, en français.
4. Progression logique : du contexte au détail opérationnel.
5. Inclus au moins UNE question liée aux marqueurs transversaux pertinents.
6. Ton conversationnel, vouvoiement professionnel.
7. Les questions doivent permettre de DIFFÉRENCIER la proposition (avantage compétitif).

CATÉGORIES (varie entre les questions) :
- context : compréhension du contexte
- objective : objectifs et résultats
- method : méthodologie et activités
- stakeholders : partenaires et bénéficiaires
- risk : risques et atténuation
- sustainability : durabilité
- compliance : conformité bailleur

Réponds UNIQUEMENT en JSON :
{
  "questions": [
    {
      "id": "q1",
      "text": "...",
      "category": "context|objective|method|stakeholders|risk|sustainability|compliance"
    }
  ]
}`;
}
