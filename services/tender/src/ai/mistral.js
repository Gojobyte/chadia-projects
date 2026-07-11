// =====================================================================
// Client Mistral pour l'analyse d'appel d'offres
// =====================================================================
// L'API Mistral (https://docs.mistral.ai/api/) suit le même contrat que
// l'API OpenAI :
//   POST https://api.mistral.ai/v1/chat/completions
//   Authorization: Bearer ${MISTRAL_API_KEY}
//   { model, messages, temperature, response_format: { type: "json_object" } }
//
// Pour l'analyse d'AO on utilise le modèle `mistral-small-latest` qui
// est le meilleur compromis qualité/prix (~3 € / 1M tokens en entrée
// au moment de l'intégration). On peut basculer sur `mistral-large-latest`
// via la variable d'env MISTRAL_MODEL.
//
// Convention : on ne lance JAMAIS l'analyse implicitement à la collecte.
// L'analyse coûte de l'argent — elle se déclenche sur demande de
// l'utilisateur via l'endpoint /opportunites/:id/analyze.

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";
const TIMEOUT_MS = 60_000;            // 60 s : LLM peut être lent
const MAX_TEXT_LEN = 12_000;          // ~3000 tokens · garde-fou pour le coût

function getApiKey() {
  const key = process.env.MISTRAL_API_KEY || "";
  return key.trim();
}

function getModel() {
  return process.env.MISTRAL_MODEL || DEFAULT_MODEL;
}

function isEnabled() {
  return getApiKey().length > 0;
}

// ---------------------------------------------------------------------
// Prompt d'analyse — version 1
// ---------------------------------------------------------------------
// On demande à Mistral d'extraire 5 blocs clés sous forme de JSON.
// Les bailleurs ont des conventions très différentes (UE PRAG, PNUD UNGM,
// USAID, BM…), donc le prompt doit rester générique. La langue de sortie
// est toujours le français (les utilisateurs CHADIA bossent en FR), même
// si l'AO d'origine est en anglais ou espagnol.

const SYSTEM_PROMPT = `Tu es un assistant expert en réponse aux appels à propositions des bailleurs internationaux (UE/ECHO, PNUD, USAID, Banque mondiale, AFD, BAD). Tu lis le texte d'une opportunité de financement et tu en extrais les éléments structurants qu'une ONG comme CHADIA doit fournir pour candidater.

Tu réponds UNIQUEMENT par un objet JSON valide, sans markdown autour, conforme exactement au schéma suivant :

{
  "piecesRequises": [
    {
      "id": "string court en kebab-case (ex: 'recepisse', 'note-methodologique')",
      "nom": "libellé court en français",
      "description": "1 phrase expliquant ce que le bailleur attend",
      "categorie": "A" | "B" | "C" | "D" | "E",
      "type": "ADMIN" | "TECHNIQUE" | "FINANCIER" | "ANNEXE",
      "obligatoire": true | false,
      "format": "PDF" | "DOCX" | "XLSX" | "LIBRE"
    }
  ],
  "criteres": [
    {
      "label": "Nom court du critère (ex: 'Capacité opérationnelle & expérience')",
      "description": "1 phrase détaillant ce qui est évalué",
      "ponderation": 25
    }
  ],
  "eligibilite": [
    {
      "label": "Critère d'éligibilité (ex: 'Personnalité juridique tchadienne · ONG enregistrée')",
      "description": "Précision technique",
      "obligatoire": true
    }
  ],
  "echeances": [
    {
      "label": "ex: 'Dépôt note conceptuelle'",
      "date": "AAAA-MM-JJ ou null si pas de date explicite"
    }
  ],
  "axesStrategiques": [
    "axe / priorité du bailleur (ex: 'Genre et inclusion', 'Nexus humanitaire-développement')"
  ],
  "indicateurs": [
    "indicateur de résultat attendu (ex: 'Nombre de ménages bénéficiaires')"
  ],
  "resume": "2-3 phrases en français résumant le contexte et l'enjeu de l'AO"
}

Règles strictes :
- Tout le contenu textuel est en français, même si l'AO d'origine est en anglais/espagnol.
- piecesRequises : VISE 15-20 entrées, jamais moins de 12 (pour les AO standard des bailleurs internationaux qui exigent un dossier complet). Réparties dans les 5 catégories suivantes :
    A · Pièces administratives (récépissé ONG, statuts, attestation fiscale, RIB, déclaration probité, …)
    B · Capacité technique (références similaires, présentation institutionnelle, bilans financiers, …)
    C · Note méthodologique (note principale, cadre logique, plan M&E, …)
    D · Budget & ressources (budget détaillé PRAG, plan trésorerie, justification coûts, …)
    E · Équipe & annexes (CV chef de mission, CV équipiers, lettres d'engagement partenaires, …)
- criteres : 4 à 6 entrées avec ponderation entière (la somme doit faire 100).
- eligibilite : 4 à 8 critères d'éligibilité obligatoires (personnalité juridique, ancienneté, expérience secteur, CA minimum, cofinancement, attestations…).
- Si une information manque dans le texte fourni, met une liste vide pour la rubrique correspondante — n'invente PAS de chiffre précis (ex: "CA ≥ 150 M FCFA") sauf s'il est explicite dans le texte. Pour l'éligibilité, des règles génériques (ex: "Personnalité juridique vérifiée") restent acceptables.
- N'ajoute aucun texte avant ou après le JSON.`;

function buildUserPrompt(opp) {
  // On agrège les informations pertinentes en gardant le texte court
  // (pour économiser des tokens). raw payload peut contenir la description
  // complète selon le connecteur source.
  const parts = [];
  parts.push(`TITRE : ${opp.titre || "(sans titre)"}`);
  if (opp.bailleurNom) parts.push(`BAILLEUR : ${opp.bailleurNom}`);
  if (opp.sourceConnector) parts.push(`SOURCE : ${opp.sourceConnector}`);
  if (opp.typeFinancement) parts.push(`TYPE DE FINANCEMENT : ${opp.typeFinancement}`);
  if (Array.isArray(opp.paysCible) && opp.paysCible.length) {
    parts.push(`PAYS CIBLES : ${opp.paysCible.join(", ")}`);
  }
  if (opp.region) parts.push(`RÉGION : ${opp.region}`);
  if (opp.dateLimiteDepot) parts.push(`DATE LIMITE DE DÉPÔT : ${new Date(opp.dateLimiteDepot).toISOString().slice(0, 10)}`);
  if (opp.datePublication) parts.push(`DATE DE PUBLICATION : ${new Date(opp.datePublication).toISOString().slice(0, 10)}`);
  if (opp.montantEstime) parts.push(`MONTANT ESTIMÉ : ${opp.montantEstime} ${opp.devise || ""}`);

  // Description : on tronque pour rester sous la limite de tokens
  if (opp.description) {
    const desc = String(opp.description).slice(0, MAX_TEXT_LEN);
    parts.push(`\nDESCRIPTION COMPLÈTE :\n${desc}`);
  }

  parts.push("\nAnalyse cet AO et renvoie le JSON conforme au schéma demandé.");
  return parts.join("\n");
}

// ---------------------------------------------------------------------
// Appel HTTP avec timeout et gestion d'erreur
// ---------------------------------------------------------------------
async function chatCompletion({ messages, model, temperature = 0.2 }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MISTRAL_API_KEY non configurée");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || getModel(),
        messages,
        temperature,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Mistral API ${r.status} : ${errText.slice(0, 300)}`);
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content) throw new Error("Mistral a retourné une réponse vide");
    return { content, usage: data.usage };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------
// Analyse d'une opportunité — retourne un objet structuré
// ---------------------------------------------------------------------
async function analyzeOpportunite(opp) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(opp) },
  ];

  const { content, usage } = await chatCompletion({ messages });

  // Le response_format json_object garantit du JSON valide ; on parse
  // quand même de façon défensive au cas où le modèle dévie.
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`Réponse Mistral non parsable : ${e.message}. Début : ${content.slice(0, 200)}`);
  }

  // Normalisation minimale (au cas où le LLM oublie un champ).
  // Pour rester rétrocompatible avec la v1 (qui retournait `criteres: string[]`),
  // on accepte les deux formats et on normalise vers { label, description, ponderation }.
  function normalizeCriteres(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((c, i) => {
      if (typeof c === "string") {
        return { label: c.split(" · ")[0] || `Critère ${i + 1}`, description: c, ponderation: null };
      }
      return {
        label: c.label || c.t || `Critère ${i + 1}`,
        description: c.description || c.s || "",
        ponderation: typeof c.ponderation === "number" ? c.ponderation : null,
      };
    });
  }

  // Pour les pièces, si la catégorie n'est pas renseignée (ancien prompt),
  // on déduit depuis le type.
  function deduireCategorie(p) {
    if (p.categorie && /^[A-E]$/.test(p.categorie)) return p.categorie;
    const t = (p.type || "").toUpperCase();
    if (t === "ADMIN") return "A";
    if (t === "TECHNIQUE") return p.nom?.toLowerCase().includes("cv") ? "E" : "B";
    if (t === "FINANCIER") return "D";
    return "E";
  }

  return {
    piecesRequises: Array.isArray(parsed.piecesRequises)
      ? parsed.piecesRequises.map((p) => ({
          ...p,
          categorie: deduireCategorie(p),
        }))
      : [],
    criteres: normalizeCriteres(parsed.criteres),
    eligibilite: Array.isArray(parsed.eligibilite) ? parsed.eligibilite : [],
    echeances: Array.isArray(parsed.echeances) ? parsed.echeances : [],
    axesStrategiques: Array.isArray(parsed.axesStrategiques) ? parsed.axesStrategiques : [],
    indicateurs: Array.isArray(parsed.indicateurs) ? parsed.indicateurs : [],
    resume: typeof parsed.resume === "string" ? parsed.resume : null,
    _meta: {
      model: getModel(),
      analyzedAt: new Date().toISOString(),
      usage: usage || null,
    },
  };
}

// =====================================================================
// Rédaction assistée des sections narratives d'une candidature
// =====================================================================
// On utilise Mistral pour produire un brouillon de section que l'utilisateur
// pourra ensuite éditer, valider ou jeter. Chaque section a un prompt
// dédié pour cadrer le ton et la structure attendus par le bailleur.

const SECTION_PROMPTS = {
  contexte: {
    titre: "Note conceptuelle · contexte et justification",
    instructions: `Rédige la section "Contexte et justification" d'une note conceptuelle de candidature. Cette section doit :
- Décrire la situation actuelle (problématique, vulnérabilités, données chiffrées si disponibles)
- Justifier la pertinence de l'intervention proposée
- Présenter brièvement l'ONG CHADIA et son expérience dans la zone/secteur
- Faire 250-400 mots
- Adopter un ton institutionnel sobre, sans superlatifs marketing
- Citer explicitement les axes stratégiques du bailleur si fournis`,
  },
  pertinence: {
    titre: "Pertinence par rapport aux priorités du bailleur",
    instructions: `Rédige la section "Pertinence" qui démontre l'alignement avec les priorités du bailleur. Doit :
- Citer EXPLICITEMENT les axes stratégiques du bailleur fournis dans le contexte
- Montrer comment l'intervention répond à chacun d'eux
- 200-350 mots, structure paragraphée
- Ton précis et technique, vocabulaire du secteur (humanitaire / développement)`,
  },
  methodologie: {
    titre: "Méthodologie & dispositif de mise en œuvre",
    instructions: `Rédige la section "Méthodologie et dispositif" qui détaille comment l'intervention sera menée. Doit :
- Présenter les phases (diagnostic → mobilisation → mise en œuvre → suivi/clôture)
- Décrire l'articulation avec les autorités locales et les comités villageois
- Préciser les modalités de ciblage des bénéficiaires
- Évoquer les modalités de redevabilité (rapports, audits)
- 300-450 mots
- Ton concret et opérationnel`,
  },
  genre: {
    titre: "Genre et inclusion",
    instructions: `Rédige la section "Genre et inclusion" qui démontre une approche intentionnelle. Doit :
- Indiquer comment les femmes et filles bénéficient prioritairement
- Décrire les mesures pour les groupes vulnérables (PSH, déplacés, jeunes)
- Mentionner les protocoles de prévention des VBG (violences basées sur le genre)
- 150-250 mots
- Ton précis, éviter les généralités`,
  },
  calendrier: {
    titre: "Calendrier opérationnel",
    instructions: `Rédige la section "Calendrier" en format narratif. Doit :
- Lister les phases avec leur durée (en mois après démarrage : M+1, M+3, M+6, etc.)
- Indiquer les livrables intermédiaires (rapport T1, T2, T3)
- Identifier les jalons critiques pour le bailleur
- 150-250 mots, format prose puis liste à puces si pertinent`,
  },
};

function buildDraftPrompt({ section, opp, cand, analysis, libraryDocs }) {
  const def = SECTION_PROMPTS[section] || SECTION_PROMPTS.contexte;
  const parts = [];

  parts.push(`Tu écris la section "${def.titre}" d'une candidature de l'ONG CHADIA (Chadia pour le Développement du Tchad, CDT, basée à N'Djamena) en réponse à un appel à propositions international.`);
  parts.push("");
  parts.push("CONSIGNES DE RÉDACTION :");
  parts.push(def.instructions);
  parts.push("");
  parts.push("CONTEXTE DE L'APPEL D'OFFRES :");
  parts.push(`- Titre : ${opp?.titre || cand.titre}`);
  if (opp?.bailleurNom || opp?.bailleur?.nom) {
    parts.push(`- Bailleur : ${opp.bailleurNom || opp.bailleur?.nom}`);
  }
  if (opp?.sourceConnector) parts.push(`- Source : ${opp.sourceConnector}`);
  if (Array.isArray(opp?.paysCible) && opp.paysCible.length) {
    parts.push(`- Pays cible(s) : ${opp.paysCible.join(", ")}`);
  }
  if (opp?.dateLimiteDepot) {
    parts.push(`- Date limite de dépôt : ${new Date(opp.dateLimiteDepot).toISOString().slice(0, 10)}`);
  }

  if (analysis?.resume) {
    parts.push(`- Résumé du bailleur : ${analysis.resume}`);
  }
  if (Array.isArray(analysis?.axesStrategiques) && analysis.axesStrategiques.length) {
    parts.push(`- Axes stratégiques du bailleur : ${analysis.axesStrategiques.join(" · ")}`);
  }
  if (Array.isArray(analysis?.criteres) && analysis.criteres.length) {
    parts.push(`- Critères d'évaluation : ${analysis.criteres.join(" / ")}`);
  }

  parts.push("");
  parts.push("CONTEXTE DE LA CANDIDATURE CHADIA :");
  parts.push(`- Titre du dossier : ${cand.titre}`);
  if (cand.description) parts.push(`- Synthèse interne : ${cand.description}`);
  if (cand.budgetDemande) {
    parts.push(`- Budget demandé : ${cand.budgetDemande} ${cand.devise || ""}`);
  }
  if (cand.dureeMois) parts.push(`- Durée prévue : ${cand.dureeMois} mois`);
  if (Array.isArray(cand.partenaires) && cand.partenaires.length) {
    parts.push(`- Partenaires : ${cand.partenaires.join(", ")}`);
  }
  if (cand.noteConcept && section !== "contexte") {
    parts.push(`- Note conceptuelle déjà rédigée (référence pour rester cohérent) : ${cand.noteConcept.slice(0, 800)}`);
  }

  parts.push("");
  parts.push("L'ONG CHADIA · faits officiels :");
  parts.push("- Dénomination : Chadia pour le Développement du Tchad (CDT)");
  parts.push("- Statut : ONG de droit tchadien à but non lucratif");
  parts.push("- Récépissé : N° 154/PCMT/PMT/MEPDCI/SE/SPONGAH/2021 du 08/12/2021");
  parts.push("- Siège : Quartier Kabalaye, en face stade Idriss Mahamat Ouya, avenue Bezo, N'Djamena");
  parts.push("- Zones d'intervention : N'Djamena, Province du Ouaddaï, Zone Est, Zone Sud du Tchad");
  parts.push("- Domaines : WASH (eau, hygiène, assainissement), BTP, entrepreneuriat & formation, santé (SR, nutrition, VBG), agriculture & élevage, éducation, énergie solaire");
  parts.push("- Bailleurs attestés : AUDA-NEPAD (Union Africaine), Solar Power Enterprise, BADEA, FER Tchad, Ministère de la Santé publique du Tchad, ONG Turc");
  parts.push("- Comptabilité : SYSCOHADA visée annuellement par cabinet Atrio Consultance (BP 6118 N'Djamena)");
  parts.push("- Effectifs : 8 salariés · équipe technique avec >20 ans d'expérience cumulée (héritage projet T45 coopération suisse 2000-2008)");
  parts.push("- Exercice 2024 : CA services 205,5 M FCFA, résultat net 15,6 M FCFA");

  // Documents pertinents de la bibliothèque CHADIA — l'IA doit s'en inspirer
  // pour ancrer le contenu dans la réalité documentaire de l'ONG.
  if (Array.isArray(libraryDocs) && libraryDocs.length > 0) {
    parts.push("");
    parts.push("DOCUMENTS DE LA BIBLIOTHÈQUE CHADIA (références à mentionner si pertinent) :");
    for (const d of libraryDocs.slice(0, 15)) {
      const tags = Array.isArray(d.tags) ? d.tags.slice(0, 5).join(", ") : "";
      let line = `- "${d.nom}"`;
      if (d.description) line += ` — ${String(d.description).slice(0, 160)}`;
      if (tags) line += ` (tags : ${tags})`;
      parts.push(line);
    }
    parts.push("Ces documents existent dans nos archives — appuie-toi dessus pour étayer tes affirmations.");
  }

  parts.push("");
  parts.push("Renvoie UNIQUEMENT le texte de la section, sans titre, sans markdown, sans préface (\"Voici le texte…\"). Texte en français institutionnel.");

  return parts.join("\n");
}

/**
 * Rédige un brouillon pour une section narrative donnée.
 * @param {object} ctx
 * @param {string} ctx.section  Une clé de SECTION_PROMPTS (contexte, methodologie, genre, pertinence, calendrier).
 * @param {object} ctx.opp      Objet Opportunite (avec rawPayload pour récupérer l'analyse)
 * @param {object} ctx.cand     Objet Candidature
 */
async function draftNarrativeSection({ section, opp, cand, libraryDocs }) {
  const known = Object.keys(SECTION_PROMPTS);
  if (!known.includes(section)) {
    throw new Error(`Section inconnue : ${section}. Valides : ${known.join(", ")}`);
  }

  // On récupère l'analyse Mistral pré-existante de l'opportunité si dispo —
  // ça permet d'alimenter le prompt avec les axes stratégiques et critères
  // sans refaire un appel d'analyse à chaque rédaction.
  const analysis = opp?.rawPayload?._chadia?.analysis || null;

  const userPrompt = buildDraftPrompt({ section, opp, cand, analysis, libraryDocs });
  const messages = [
    {
      role: "system",
      content:
        "Tu es un rédacteur expérimenté en montage de projets de développement. Tu écris en français institutionnel sobre, sans superlatifs, en restant fidèle au contexte fourni. Tu ne mentionnes JAMAIS que tu es une IA.",
    },
    { role: "user", content: userPrompt },
  ];

  // Pour la rédaction, response_format JSON ne s'applique pas — on veut du
  // texte libre. On utilise une fonction de complétion sans contrainte JSON.
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MISTRAL_API_KEY non configurée");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages,
        temperature: 0.4,        // un peu plus de créativité que l'analyse
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Mistral API ${r.status} : ${errText.slice(0, 300)}`);
    }
    const data = await r.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new Error("Mistral a retourné un brouillon vide");
    return {
      text,
      section,
      titre: SECTION_PROMPTS[section].titre,
      usage: data.usage || null,
      _meta: { model: getModel(), draftedAt: new Date().toISOString() },
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  isEnabled,
  analyzeOpportunite,
  draftNarrativeSection,
  getModel,
  SECTION_PROMPTS,
};
