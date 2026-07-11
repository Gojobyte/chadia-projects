// =====================================================================
// Connecteur TED — Tenders Electronic Daily (Union européenne)
// =====================================================================
// API REST officielle : POST https://api.ted.europa.eu/v3/notices/search
// La syntaxe de query est un mini DSL "expert search" eForms.
// On récupère les notices dont le lieu d'exécution (place-of-performance)
// est le Tchad ou ses pays limitrophes, sur les 365 derniers jours.
//
// La réponse contient des champs multilingues (objet par code ISO 3 lettres
// minuscule : fra, eng, deu, ara…). On préfère le français puis l'anglais.
//
// Ce module est isomorphe : il NE touche PAS à la DB, il retourne juste
// des "opportunités normalisées" prêtes à être upsertées par
// l'orchestrateur (connectors/index.js).

const TED_ENDPOINT = "https://api.ted.europa.eu/v3/notices/search";

// Pays cibles : Tchad UNIQUEMENT (décision CHADIA — éviter le bruit
// des AAP régionaux qui ne couvrent pas le pays). Les notices régionales
// qui INCLUENT le Tchad dans leur liste de place-of-performance seront
// quand même ramenées, car TED matche sur la valeur dans le tableau.
const COUNTRIES_TARGET = ["TCD"];

// Pays prioritaire pour le tagging
const PRIMARY_COUNTRY = "TCD";

// Codes CPV indicatifs — pour info, on ne filtre pas dessus (trop restrictif).
// Référence : https://simap.ted.europa.eu/cpv

// Limite de résultats par appel (TED autorise jusqu'à 250 par page).
const PAGE_SIZE = 50;
const MAX_PAGES = 5; // garde-fou : 250 résultats max par run

// Champs eForms qu'on demande à TED.
const TED_FIELDS = [
  "notice-title",
  "buyer-name",
  "description-lot",
  "description-proc",
  "classification-cpv",
  "publication-date",
  "deadline-receipt-tender-date-lot",
  "deadline-receipt-request-date-lot",
  "place-of-performance",
  "total-value",
  "notice-type",
];

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Extrait la meilleure valeur texte d'un champ TED multilingue.
// TED renvoie soit { fra: "...", eng: "..." }, soit { fra: ["..."], eng: ["..."] }.
function pickMultilingual(field) {
  if (!field) return null;
  if (typeof field === "string") return field;
  const order = ["fra", "eng", "deu", "spa", "ita"];
  for (const lang of order) {
    const v = field[lang];
    if (Array.isArray(v) && v.length) return String(v[0]);
    if (typeof v === "string" && v.trim()) return v;
  }
  // Fallback : prendre la première langue disponible
  for (const k of Object.keys(field)) {
    const v = field[k];
    if (Array.isArray(v) && v.length) return String(v[0]);
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

// Extrait la première date d'un array de dates ISO TED (ex: "2025-08-15+02:00")
function pickDate(field) {
  if (!field) return null;
  const raw = Array.isArray(field) ? field[0] : field;
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch { return null; }
}

// Tente de classer le type de financement à partir du type de notice TED.
// Par défaut on met MARCHE_SERVICE pour la majorité des notices TED.
function inferTypeFinancement(noticeType, cpvCodes = []) {
  const nt = (noticeType ? String(noticeType) : "").toLowerCase();
  if (nt.includes("grant") || nt.includes("subvent")) return "SUBVENTION";
  if (nt.includes("works") || nt.includes("travaux")) return "MARCHE_TRAVAUX";
  if (nt.includes("supplies") || nt.includes("fournit")) return "MARCHE_FOURNITURES";
  // Heuristique CPV : 45000000 = travaux construction
  if (cpvCodes.some((c) => String(c).startsWith("45"))) return "MARCHE_TRAVAUX";
  // Heuristique CPV : entre 30000000 et 44999999 = fournitures
  if (cpvCodes.some((c) => { const n = Number(c); return n >= 30_000_000 && n < 45_000_000; })) return "MARCHE_FOURNITURES";
  return "MARCHE_SERVICE";
}

// Tente de deviner un secteur lisible à partir des codes CPV.
function inferSecteur(cpvCodes = []) {
  if (!cpvCodes.length) return null;
  const cpv = String(cpvCodes[0]);
  const prefix = cpv.slice(0, 2);
  const MAP = {
    "03": "Agriculture & élevage",
    "09": "Énergie",
    "14": "Mines & matières premières",
    "15": "Alimentation",
    "18": "Vêtement & textile",
    "30": "Bureautique & IT",
    "33": "Santé & médical",
    "34": "Transport",
    "35": "Sécurité & secours",
    "37": "Articles de sport",
    "38": "Instruments & laboratoire",
    "39": "Mobilier & ménager",
    "41": "Eau & captation",
    "42": "Machines industrielles",
    "44": "Matériaux & construction",
    "45": "Travaux de construction",
    "48": "Logiciels",
    "50": "Réparation & maintenance",
    "51": "Installation",
    "55": "Hôtellerie & restauration",
    "60": "Services de transport",
    "63": "Voyages & logistique",
    "64": "Postal & télécom",
    "65": "Services publics utilités",
    "66": "Services financiers",
    "70": "Immobilier",
    "71": "Architecture & ingénierie",
    "72": "Services IT",
    "73": "R&D",
    "75": "Administration publique",
    "76": "Pétrole & gaz",
    "77": "Services agricoles",
    "79": "Services aux entreprises",
    "80": "Éducation & formation",
    "85": "Santé & action sociale",
    "90": "Environnement",
    "92": "Culture, sports, loisirs",
    "98": "Autres services",
  };
  return MAP[prefix] ?? `CPV ${prefix}xxxxxx`;
}

// ---------------------------------------------------------------------
// Normalisation d'une notice TED → opportunité CHADIA
// ---------------------------------------------------------------------
function normalizeTedNotice(notice) {
  const pubNumber = notice["publication-number"];
  if (!pubNumber) return null;

  const titre = pickMultilingual(notice["notice-title"]) ?? `Notice ${pubNumber}`;
  const buyer = pickMultilingual(notice["buyer-name"]);
  const description = pickMultilingual(notice["description-lot"])
    ?? pickMultilingual(notice["description-proc"]);

  const cpvCodes = Array.isArray(notice["classification-cpv"]) ? notice["classification-cpv"] : [];
  const places = Array.isArray(notice["place-of-performance"]) ? notice["place-of-performance"] : [];

  // URL d'affichage en français côté UE
  const sourceUrl = notice?.links?.html?.FRA
    ?? notice?.links?.html?.ENG
    ?? `https://ted.europa.eu/fr/notice/-/detail/${pubNumber}`;

  return {
    sourceConnector: "TED",
    sourceId: String(pubNumber),
    sourceUrl,
    bailleurNom: buyer,           // souvent l'organisme acheteur ; on n'a pas toujours de mapping FK
    titre,
    description,
    secteur: inferSecteur(cpvCodes),
    typeFinancement: inferTypeFinancement(notice["notice-type"], cpvCodes),
    paysCible: places,
    devise: "EUR",
    montantEstime: null,          // TED expose total-value mais c'est multi-champ et bruyant : laissé pour V2
    datePublication: pickDate(notice["publication-date"]),
    dateLimiteDepot: pickDate(notice["deadline-receipt-tender-date-lot"])
      ?? pickDate(notice["deadline-receipt-request-date-lot"]),
    tags: cpvCodes.slice(0, 5).map((c) => `CPV-${String(c).slice(0,2)}`),
    rawPayload: notice,
  };
}

// ---------------------------------------------------------------------
// Construction de la query expert
// ---------------------------------------------------------------------
function buildQuery({ daysWindow = 365 } = {}) {
  const placeFilter = COUNTRIES_TARGET.map((c) => `place-of-performance="${c}"`).join(" OR ");
  const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, "");
  return `(${placeFilter}) AND publication-date>=${since}`;
}

// ---------------------------------------------------------------------
// Fetch principal (avec pagination)
// ---------------------------------------------------------------------
async function fetchTedOpportunities({ daysWindow = 365, maxPages = MAX_PAGES } = {}) {
  const query = buildQuery({ daysWindow });
  const collected = [];
  let page = 1;

  while (page <= maxPages) {
    const body = { query, fields: TED_FIELDS, limit: PAGE_SIZE, page };
    let resp;
    try {
      resp = await fetch(TED_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`TED fetch error (page ${page}): ${e.message}`);
    }
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`TED status ${resp.status} (page ${page}): ${t.slice(0, 250)}`);
    }
    const data = await resp.json();
    const notices = Array.isArray(data.notices) ? data.notices : [];
    for (const n of notices) {
      const norm = normalizeTedNotice(n);
      if (norm) collected.push(norm);
    }
    if (notices.length < PAGE_SIZE) break; // dernière page atteinte
    page++;
  }

  return { collected, primaryCountry: PRIMARY_COUNTRY };
}

module.exports = { fetchTedOpportunities };
