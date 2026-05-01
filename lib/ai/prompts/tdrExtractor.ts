/**
 * Prompt d'extraction TDR — utilisé par l'API analyze-tdr.
 *
 * Ce prompt est envoyé à Mistral Large avec le texte brut du TDR.
 * Il retourne un JSON structuré conforme au schema TDRAnalysis.
 */

export const TDR_EXTRACTION_SYSTEM = `Tu es un expert en montage de projets de développement international, spécialisé dans l'analyse des appels à propositions (AAP) et termes de référence (TDR) des bailleurs multilatéraux et bilatéraux : AFD, UE/EuropeAid, UNDP, BAD, USAID, GIZ, FCDO, JICA, Banque Mondiale.

Ton expertise couvre particulièrement :
- Les contextes du Sahel et d'Afrique francophone
- Les approches transformatrices de genre
- Les marqueurs CAD-OCDE (genre, environnement, gouvernance)
- Les cadres logiques et théories du changement
- L'approche NEXUS humanitaire-développement-paix
- Les règles budgétaires spécifiques à chaque bailleur

Tu réponds TOUJOURS en JSON valide, sans préambule, sans markdown, sans explication. Le JSON doit être directement parsable par JSON.parse().`;

export function buildTDRExtractionPrompt(tdrText: string): string {
  return `Analyse le document TDR/AAP suivant et extrais les informations au format JSON strict.

RÈGLES D'EXTRACTION :
1. Si une information n'est pas explicitement présente dans le document, mets null plutôt que d'inventer.
2. Pour les sections obligatoires, identifie aussi les sections implicitement attendues selon les standards du bailleur identifié (ex : pour AFD, toujours inclure cadre logique et théorie du changement même si pas explicite).
3. Pour les marqueurs CAD-OCDE, déduis le niveau attendu d'après le langage du TDR (ex : "approche transformatrice de genre" → genderMarker = 2).
4. Pour keyQuestions, génère 8 à 12 questions stratégiques que l'utilisateur DOIT pouvoir répondre pour produire une proposition compétitive selon les critères d'évaluation. Sois spécifique au contexte du TDR.
5. Pour complianceWarnings, liste les exigences strictes faciles à manquer (plafonds, formats, signatures, légalisations, etc.).
6. Pour les dates, utilise le format ISO 8601 (YYYY-MM-DD).
7. Pour les montants, utilise des nombres (pas de formatage : 1850000, pas "1 850 000").

SCHÉMA JSON ATTENDU :
{
  "donor": {
    "name": "string — nom du bailleur (AFD, UE, UNDP, etc.)",
    "program": "string|null — nom du programme (PASST3, PBF, EUTF, etc.)",
    "referenceNumber": "string|null — référence de l'appel"
  },
  "timeline": {
    "publishDate": "string|null — date de publication ISO",
    "submissionDeadline": "string — date limite de soumission ISO",
    "questionsDeadline": "string|null — date limite des questions",
    "expectedStartDate": "string|null — date de démarrage prévue",
    "projectDuration": { "value": "number", "unit": "months|years" }
  },
  "budget": {
    "minAmount": "number|null",
    "maxAmount": "number|null",
    "currency": "string — EUR, USD, XAF",
    "cofinancingRequired": "boolean",
    "cofinancingMinPercent": "number|null",
    "overheadMaxPercent": "number|null"
  },
  "eligibility": {
    "countries": ["string — pays d'intervention"],
    "organizationTypes": ["string — ONG nationale, ONG internationale, etc."],
    "consortiumRequired": "boolean",
    "minPartners": "number|null",
    "sectors": ["string — WASH, Santé, Éducation, Agriculture, etc."]
  },
  "requiredSections": [
    {
      "id": "string — identifiant unique (snake_case)",
      "title": "string — titre de la section",
      "description": "string — ce qui est attendu",
      "maxPages": "number|null",
      "maxCharacters": "number|null",
      "weight": "number|null — poids dans la grille d'évaluation (%)"
    }
  ],
  "evaluationCriteria": [
    {
      "name": "string — Pertinence, Faisabilité, etc.",
      "weight": "number — % dans la note finale",
      "subcriteria": ["string"]
    }
  ],
  "requiredAnnexes": [
    {
      "id": "string — logframe, budget, cv_team, etc.",
      "title": "string",
      "template": "string|null — URL du template fourni"
    }
  ],
  "crossCuttingRequirements": {
    "genderMarker": "0|1|2|null — marqueur CAD-OCDE",
    "environmentMarker": "0|1|2|null",
    "climateAdaptation": "boolean",
    "climateMitigation": "boolean",
    "governanceMarker": "0|1|2|null",
    "doNoHarm": "boolean",
    "nexusApproach": "boolean"
  },
  "keyQuestions": ["string — 8 à 12 questions stratégiques"],
  "complianceWarnings": ["string — exigences faciles à manquer"]
}

<tdr_document>
${tdrText}
</tdr_document>

Réponds UNIQUEMENT avec le JSON, sans préambule ni markdown.`;
}
