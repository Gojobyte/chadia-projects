/**
 * Prompt d'extraction TDR — Phase 1.5
 *
 * Améliorations vs Phase 1 :
 * - Contraintes minimales de qualité par champ
 * - Few-shot exemple d'extraction riche
 * - Instructions explicites contre les extractions tronquées
 */

export const TDR_EXTRACTION_SYSTEM = `Tu es un expert senior en montage de projets de développement international, avec 15 ans d'expérience dans l'analyse des appels à propositions (AAP) et termes de référence (TDR) des bailleurs multilatéraux et bilatéraux : AFD, UE/EuropeAid, UNDP, BAD, USAID, GIZ, FCDO, JICA, Banque Mondiale.

Ton expertise couvre particulièrement :
- Les contextes du Sahel et d'Afrique francophone
- Les approches transformatrices de genre (marqueur CAD-OCDE 0/1/2)
- Les cadres logiques, théories du changement, et approches basées sur les droits
- L'approche NEXUS humanitaire-développement-paix
- Les règles budgétaires et administratives spécifiques à chaque bailleur
- La rédaction de propositions compétitives (taux de succès, positionnement stratégique)

Tu réponds TOUJOURS en JSON valide, sans préambule, sans backticks markdown, sans explication. Le JSON doit être directement parsable par JSON.parse().`;

export function buildTDRExtractionPrompt(tdrText: string): string {
  return `Analyse le document TDR/AAP suivant et extrais les informations au format JSON strict.

RÈGLES D'EXTRACTION :
1. Si une information n'est pas explicitement présente dans le document, mets null plutôt que d'inventer.
2. Pour les sections obligatoires, identifie aussi les sections implicitement attendues selon les standards du bailleur identifié.
3. Pour les marqueurs CAD-OCDE, déduis le niveau attendu d'après le langage du TDR.
4. Pour les dates, utilise le format ISO 8601 (YYYY-MM-DD).
5. Pour les montants, utilise des nombres (pas de formatage : 1850000, pas "1 850 000").

RÈGLES STRICTES DE QUALITÉ — toute extraction non conforme sera rejetée :

A) **requiredSections[].description** : MINIMUM 200 caractères par description. Doit décrire PRÉCISÉMENT ce que le bailleur attend dans cette section, en mentionnant :
   - Les éléments de contenu obligatoires
   - Le niveau de détail attendu
   - Les références aux critères d'évaluation liés
   - Les standards méthodologiques attendus (cadre logique, théorie du changement, approche genre, NEXUS, etc.)
   ❌ INTERDIT : "Approche", "Synthèse", "CV", "Méthodologie", "Contexte et justification"
   ✅ ATTENDU : des phrases complètes décrivant en détail ce qui est attendu

B) **requiredSections[].weight** : NE PAS inventer de pourcentages si le TDR ne donne pas de pondération explicite par section. Mets null. La pondération s'applique aux evaluationCriteria, pas aux sections sauf indication contraire du TDR.

C) **evaluationCriteria[].subcriteria** : MINIMUM 3 sous-critères par critère. Si le TDR n'en mentionne pas explicitement, déduis-les d'après les standards du bailleur identifié et les bonnes pratiques du secteur.

D) **keyQuestions** : EXACTEMENT 8 à 12 questions. Chaque question DOIT :
   - Être une phrase interrogative complète terminée par "?"
   - Faire entre 80 et 250 caractères
   - Être spécifique au contexte du TDR (mentionner le bailleur, le secteur, la zone géographique, ou un enjeu spécifique)
   - Ne PAS être préfixée par "Q1:", "Q2:", etc.
   - Couvrir au moins une fois chaque catégorie : pertinence, faisabilité, impact, durabilité, partenariats, risques, genre/inclusion

E) **complianceWarnings** : MINIMUM 5 alertes. Inclure systématiquement :
   - Plafonds budgétaires et frais administratifs max
   - Deadlines (soumission, questions, démarrage)
   - Documents administratifs obligatoires (enregistrement, statuts, audit)
   - Limites de pages / caractères par section si mentionnées
   - Exigences de format (signatures, légalisations, langues, nombre de copies)

F) **eligibility.sectors** : Lister TOUS les secteurs explicitement ou implicitement couverts. Ne pas se limiter à 1 secteur. Exemple : pour un projet de cohésion sociale, inclure aussi gouvernance locale, dialogue intercommunautaire, autonomisation économique, genre, jeunesse, etc.

SCHÉMA JSON ATTENDU :
{
  "donor": {
    "name": "string — nom court du bailleur (UNDP, AFD, UE, etc.)",
    "program": "string|null — nom du programme ou instrument",
    "referenceNumber": "string|null — référence officielle de l'appel"
  },
  "timeline": {
    "publishDate": "string|null — date ISO",
    "submissionDeadline": "string — date ISO",
    "questionsDeadline": "string|null — date ISO",
    "expectedStartDate": "string|null — date ISO",
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
    "countries": ["string"],
    "organizationTypes": ["string"],
    "consortiumRequired": "boolean",
    "minPartners": "number|null",
    "sectors": ["string — lister TOUS les secteurs pertinents, pas seulement le principal"]
  },
  "requiredSections": [
    {
      "id": "string — snake_case unique",
      "title": "string",
      "description": "string — MINIMUM 200 caractères, description détaillée",
      "maxPages": "number|null",
      "maxCharacters": "number|null",
      "weight": "number|null — UNIQUEMENT si le TDR le précise explicitement"
    }
  ],
  "evaluationCriteria": [
    {
      "name": "string",
      "weight": "number — %",
      "subcriteria": ["string — MINIMUM 3 sous-critères"]
    }
  ],
  "requiredAnnexes": [
    {
      "id": "string — snake_case",
      "title": "string",
      "template": "string|null"
    }
  ],
  "crossCuttingRequirements": {
    "genderMarker": "0|1|2|null",
    "environmentMarker": "0|1|2|null",
    "climateAdaptation": "boolean",
    "climateMitigation": "boolean",
    "governanceMarker": "0|1|2|null",
    "doNoHarm": "boolean",
    "nexusApproach": "boolean"
  },
  "keyQuestions": ["string — 8 à 12 questions complètes de 80-250 caractères"],
  "complianceWarnings": ["string — minimum 5 alertes"]
}

<exemple_extraction_qualite>
Voici le NIVEAU DE QUALITÉ MINIMAL attendu pour chaque champ, sur un TDR UNDP/PBF Sahel :

"requiredSections": [
  {
    "id": "context_analysis",
    "title": "Analyse du contexte et justification",
    "description": "Analyse approfondie du contexte sécuritaire, social et économique de la zone d'intervention. Identification des dynamiques de conflit entre communautés hôtes et populations déplacées/réfugiées, cartographie des facteurs de tension et de cohésion. Références au Plan national de consolidation de la paix, au Cadre de Coopération des Nations Unies (UNSDCF), et aux priorités du PBF. Identification des ODD ciblés (notamment ODD 16 Paix et ODD 5 Égalité des sexes). Analyse des interventions existantes et leçons apprises dans la zone. Justification du choix des zones géographiques et des bénéficiaires cibles.",
    "maxPages": 5,
    "maxCharacters": null,
    "weight": null
  }
],
"evaluationCriteria": [
  {
    "name": "Pertinence et compréhension du contexte",
    "weight": 20,
    "subcriteria": [
      "Qualité de l'analyse des dynamiques de conflit et de cohésion dans les zones ciblées",
      "Alignement avec les priorités du PBF et du plan national de consolidation de la paix",
      "Pertinence de l'approche par rapport aux besoins identifiés des populations cibles",
      "Prise en compte des leçons apprises des interventions précédentes dans la zone"
    ]
  }
],
"keyQuestions": [
  "Comment votre organisation analyse-t-elle les dynamiques de conflit spécifiques entre communautés hôtes et réfugiés dans les zones d'Adré, Goz-Beïda et Guéréda, et quelles sont les tensions prioritaires à adresser ?",
  "Quelle est votre expérience opérationnelle en matière de programmes AVEC ou de microfinance communautaire dans des contextes de déplacement forcé au Sahel ?",
  "Comment votre approche méthodologique intègre-t-elle concrètement la dimension genre (marqueur CAD-OCDE niveau 2) et l'autonomisation économique des femmes dans le cadre des groupes AVEC ?",
  "Quels mécanismes de coordination prévoyez-vous avec les autorités locales, les agences UN présentes et les autres OSC intervenant dans les mêmes zones pour éviter les doublons ?",
  "Comment garantissez-vous la pérennité des groupes AVEC au-delà de la période de financement de 6 mois, compte tenu de la courte durée du projet ?",
  "Quelle est votre stratégie de gestion des risques sécuritaires dans l'Est du Tchad, notamment en cas de détérioration de la situation à la frontière soudanaise ?",
  "Comment votre cadre logique articule-t-il les résultats immédiats (outputs) liés à la formation AVEC avec les effets à moyen terme (outcomes) sur la cohésion sociale intercommunautaire ?",
  "Quel dispositif de suivi-évaluation participatif prévoyez-vous pour mesurer l'impact sur la cohésion sociale au-delà des indicateurs financiers des groupes AVEC ?"
],
"complianceWarnings": [
  "Budget fixe de 185 000 USD — méthode QB-FBS : le budget ne peut pas être modifié, seule la qualité technique est évaluée",
  "Frais de gestion (overhead) limités à 7% maximum du budget total",
  "Date limite de soumission : 30 avril 2026 à 17h00 GMT — aucune soumission tardive acceptée",
  "Proposition technique limitée à 31 pages maximum (hors annexes)",
  "Documents légaux obligatoires : certificat d'enregistrement au Tchad, statuts à jour, rapport d'audit des 2 dernières années",
  "Minimum 3 références de projets similaires (AVEC ou microfinance communautaire) à joindre en annexe",
  "La proposition doit être rédigée intégralement en français"
]
</exemple_extraction_qualite>

<tdr_document>
${tdrText}
</tdr_document>

Réponds UNIQUEMENT avec le JSON complet et conforme au schéma. Pas de backticks, pas de préambule.`;
}

/**
 * Prompt de correction — utilisé quand la première extraction échoue la validation Zod.
 */
export function buildTDRCorrectionPrompt(tdrText: string, errors: string): string {
  return `Tu as produit une extraction TDR qui a échoué aux validations de qualité suivantes :

${errors}

Refais l'extraction du MÊME document en corrigeant SPÉCIFIQUEMENT ces problèmes.
Rappel des règles critiques :
- Les descriptions de sections doivent faire MINIMUM 200 caractères (phrases complètes, pas des mots isolés)
- Les sous-critères doivent être au minimum 3 par critère d'évaluation
- Les keyQuestions doivent être 8-12 questions complètes de 80-250 caractères terminées par "?"
- Les complianceWarnings doivent être au minimum 5

<tdr_document>
${tdrText}
</tdr_document>

Réponds UNIQUEMENT avec le JSON complet et conforme. Pas de backticks, pas de préambule.`;
}
