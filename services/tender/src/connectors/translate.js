// =====================================================================
// Module de traduction — DeepL API (Free tier)
// =====================================================================
// On l'utilise pour traduire automatiquement titre + description des
// opportunités collectées qui ne sont pas déjà en français.
//
// Endpoint Free : https://api-free.deepl.com/v2/translate
// Endpoint Pro  : https://api.deepl.com/v2/translate
// Le free tier se reconnaît au suffixe ":fx" dans la clé. On bascule
// automatiquement vers le bon endpoint.
//
// La clé doit être fournie via la variable d'environnement DEEPL_API_KEY.
// Si elle est absente, les fonctions retournent { translated: false, ... }
// sans planter — la collecte continue avec les textes originaux.
//
// Quota Free : 500 000 caractères / mois. Largement suffisant pour
// 200-300 opportunités / mois (estimation ~1500 caractères chacune).

const DEEPL_KEY = process.env.DEEPL_API_KEY || "";
const isFreeTier = DEEPL_KEY.endsWith(":fx");
const ENDPOINT = isFreeTier
  ? "https://api-free.deepl.com/v2/translate"
  : "https://api.deepl.com/v2/translate";

const TARGET_LANG = "FR";
const BATCH_SIZE = 50;       // DeepL accepte jusqu'à 50 textes par requête
const MAX_TEXT_LENGTH = 5000; // garde-fou : on coupe les textes trop longs

function isEnabled() {
  return Boolean(DEEPL_KEY);
}

// Heuristique légère : si la langue source est déjà FR, pas besoin
// d'appeler DeepL. On reconnaît le français à quelques tokens fréquents
// (l'/la/le/des/et/dans/etc.).
function looksFrench(text) {
  if (!text) return true;
  const sample = String(text).toLowerCase().slice(0, 500);
  const frenchMarkers = [
    " le ", " la ", " les ", " des ", " du ", " de la ", " un ", " une ",
    " et ", " ou ", " dans ", " pour ", " avec ", " sont ", " est ", " sera ",
    " sera ", " être ", " ce ", " cette ", " ces ", " son ", " sa ", " ses ",
    "appel", "candidat", "soumissionnaire", "marché", "consultant",
  ];
  let hits = 0;
  for (const m of frenchMarkers) if (sample.includes(m)) hits++;
  return hits >= 3;
}

/**
 * Traduit un tableau de textes vers le français.
 * Retourne :
 *  - { translated: false, reason: "no-key" } si clé absente
 *  - { translated: true, results: [{ text, detectedSource }] } sinon
 *
 * Les positions du tableau d'entrée sont préservées dans la sortie.
 */
async function translateBatch(texts) {
  if (!isEnabled()) return { translated: false, reason: "no-key", results: null };
  if (!texts || texts.length === 0) return { translated: true, results: [] };

  // DeepL accepte un tableau `text=...&text=...` répété
  const params = new URLSearchParams();
  params.append("target_lang", TARGET_LANG);
  // On ne précise PAS source_lang → DeepL la détecte
  for (const t of texts) {
    params.append("text", (t || "").slice(0, MAX_TEXT_LENGTH));
  }

  let resp;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "ChadiaProjects/1.0",
      },
      body: params.toString(),
    });
  } catch (e) {
    return { translated: false, reason: `network: ${e.message}`, results: null };
  }

  if (!resp.ok) {
    // 456 = quota exceeded ; 429 = rate limit ; autres = erreur DeepL
    const body = await resp.text().catch(() => "");
    return { translated: false, reason: `http ${resp.status}: ${body.slice(0, 200)}`, results: null };
  }

  const data = await resp.json();
  const results = (data.translations || []).map((t) => ({
    text: t.text,
    detectedSource: t.detected_source_language,
  }));
  return { translated: true, results };
}

/**
 * Traduit titre + description d'une opportunité (les deux d'un coup).
 * Si déjà en FR (détecté par heuristique), retourne l'original sans appel API.
 * Si traduction réussie, retourne :
 *   { titre, description, langueOriginale, originalTitre, originalDescription }
 * Sinon, retourne l'original avec translated=false.
 */
async function translateOpportunity({ titre, description }) {
  const original = { titre, description };

  // Court-circuit : si titre ET description semblent déjà français,
  // on ne touche pas (économise quota DeepL).
  if (looksFrench(titre) && looksFrench(description)) {
    return { ...original, translated: false, reason: "looks-french", original };
  }

  if (!isEnabled()) {
    return { ...original, translated: false, reason: "no-key", original };
  }

  const inputs = [titre || "", description || ""];
  const batch = await translateBatch(inputs);
  if (!batch.translated || !batch.results) {
    return { ...original, translated: false, reason: batch.reason, original };
  }

  const [tTitre, tDesc] = batch.results;
  return {
    titre: tTitre?.text || titre,
    description: tDesc?.text || description,
    langueOriginale: tTitre?.detectedSource || null,
    translated: true,
    original,
  };
}

/**
 * Vérifie le quota DeepL restant. Retourne `{ characterCount, characterLimit }`
 * ou null si la clé est absente / l'API ne répond pas.
 */
async function getUsage() {
  if (!isEnabled()) return null;
  const url = isFreeTier
    ? "https://api-free.deepl.com/v2/usage"
    : "https://api.deepl.com/v2/usage";
  try {
    const r = await fetch(url, { headers: { "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

module.exports = {
  isEnabled,
  looksFrench,
  translateBatch,
  translateOpportunity,
  getUsage,
  BATCH_SIZE,
};
