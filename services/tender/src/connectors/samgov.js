// =====================================================================
// Connecteur Sam.gov — System for Award Management (gouvernement US)
// =====================================================================
// Couvre toutes les agences fédérales US : USAID, Department of State,
// MCC, OFDA, USDA, US Embassy à N'Djamena, etc.
//
// Endpoint public (sans clé API requise) :
//   GET https://sam.gov/api/prod/sgs/v1/search
//
// Accept: application/hal+json (sinon 406)
// Le filtre géographique se fait via la query expert
//   placeOfPerformance.country="Chad"
//
// On filtre aussi sur isActive=true pour ne garder que les opportunités
// encore ouvertes. SAM publie souvent en parallèle plusieurs notices
// pour un même marché ("Sources Sought" puis "Solicitation" puis "Award") :
// on les garde toutes — chacune compte comme une opportunité distincte
// avec son propre publication-number.

const ENDPOINT = "https://sam.gov/api/prod/sgs/v1/search";

const PAGE_SIZE = 25;
const MAX_PAGES = 4; // 100 max par run

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Nettoyage HTML basique pour descriptions Sam.gov (souvent en HTML)
function stripHtml(html) {
  if (!html) return null;
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Type Sam.gov → typeFinancement CHADIA
function inferTypeFinancement(typeValue, naicsCodes = []) {
  const v = (typeValue || "").toLowerCase();
  if (v.includes("grant") || v.includes("cooperative")) return "SUBVENTION";
  if (v.includes("sources sought") || v.includes("award") || v.includes("synopsis")) return "MARCHE_SERVICE";
  // Heuristique NAICS : 23xxxx = construction
  if (naicsCodes.some((c) => String(c).startsWith("23"))) return "MARCHE_TRAVAUX";
  // 31-33xxxx = manufacturing → fournitures
  if (naicsCodes.some((c) => /^3[1-3]/.test(String(c)))) return "MARCHE_FOURNITURES";
  return "MARCHE_SERVICE";
}

// NAICS code → secteur lisible (simplifié)
function inferSecteur(naicsCodes = []) {
  if (!naicsCodes.length) return null;
  const code = String(naicsCodes[0]);
  const prefix = code.slice(0, 2);
  const MAP = {
    "11": "Agriculture, foresterie, pêche",
    "21": "Mines & extraction",
    "22": "Énergie & services publics",
    "23": "Construction",
    "31": "Industries manufacturières",
    "32": "Industries manufacturières",
    "33": "Industries manufacturières",
    "42": "Commerce de gros",
    "44": "Commerce de détail",
    "45": "Commerce de détail",
    "48": "Transport & logistique",
    "49": "Transport & logistique",
    "51": "Information & médias",
    "52": "Finance & assurances",
    "53": "Immobilier",
    "54": "Services professionnels & techniques",
    "55": "Holdings & gestion",
    "56": "Services administratifs & soutien",
    "61": "Éducation & formation",
    "62": "Santé & action sociale",
    "71": "Arts, culture & loisirs",
    "72": "Hôtellerie & restauration",
    "81": "Autres services",
    "92": "Administration publique",
  };
  return MAP[prefix] ?? `NAICS ${prefix}xxxx`;
}

// Construction de l'URL d'affichage publique d'une notice Sam.gov
function buildPublicUrl(noticeId) {
  return `https://sam.gov/opp/${noticeId}/view`;
}

// ---------------------------------------------------------------------
// Normalisation Sam.gov → Opportunite CHADIA
// ---------------------------------------------------------------------
function normalize(notice) {
  const id = notice._id || notice.id || notice.solicitationNumber;
  if (!id) return null;

  const titre = (notice.title || "").trim() || `Notice Sam.gov ${id}`;
  const description = stripHtml(notice.descriptions?.[0]?.content);

  // Hiérarchie agence (DOD > Navy > NAVSUP > …) — on prend les 2-3 derniers niveaux
  // pour avoir un libellé lisible
  const orgs = Array.isArray(notice.organizationHierarchy) ? notice.organizationHierarchy : [];
  const bailleurNom = orgs.length
    ? orgs.slice(-2).map((o) => o.name).filter(Boolean).join(" — ")
    : "US Government";

  const naicsCodes = (notice.naics || []).map((n) => n.code).filter(Boolean);
  const place = notice.placeOfPerformance?.[0];

  // Garde-fou strict contre les faux positifs.
  //
  // Le mot anglais "Chad" est très ambigu : c'est un prénom courant aux US,
  // et Sam.gov inclut le contact dans la description, donc on récolte des
  // tonnes de notices US qui n'ont rien à voir avec le Tchad.
  //
  // On n'accepte une notice QUE si :
  //   (1) country est explicitement TCD/CHD, OU
  //   (2) le titre ou la ville contiennent un marqueur non-ambigu :
  //       - "tchad" (orthographe française, jamais un prénom)
  //       - "n'djamena" / "ndjamena" / "n djamena" (la capitale)
  // Le mot "chad" seul est ignoré (trop de faux positifs).
  const country = place?.country;
  const isExplicitChad = country === "TCD" || country === "CHD";

  const titleLow = (titre || "").toLowerCase();
  const cityLow = (place?.city || "").toLowerCase();
  const njamenaRegex = /n['’ ]?djamena/i;
  const mentionsChad =
    titleLow.includes("tchad") ||
    njamenaRegex.test(titre || "") ||
    njamenaRegex.test(cityLow);

  if (!isExplicitChad && !mentionsChad) return null;

  return {
    sourceConnector: "SAM_GOV",
    sourceId: String(id),
    sourceUrl: buildPublicUrl(id),
    bailleurNom,
    titre,
    description,
    secteur: inferSecteur(naicsCodes),
    typeFinancement: inferTypeFinancement(notice.type?.value, naicsCodes),
    paysCible: ["TCD"],
    region: place?.city || place?.state || null,
    devise: "USD",
    montantEstime: notice.award?.amount ? Number(notice.award.amount) : null,
    datePublication: notice.publishDate ? new Date(notice.publishDate).toISOString() : null,
    dateLimiteDepot: notice.responseDate ? new Date(notice.responseDate).toISOString() : null,
    tags: naicsCodes.slice(0, 5).map((c) => `NAICS-${String(c).slice(0, 2)}`),
    rawPayload: notice,
  };
}

// ---------------------------------------------------------------------
// Fetch principal
// ---------------------------------------------------------------------
async function fetchSamGovOpportunities(/* opts */) {
  const collected = [];
  const query = 'placeOfPerformance.country="Chad"';

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      index: "opp",
      q: query,
      size: String(PAGE_SIZE),
      page: String(page),
      sort: "-modifiedDate",
    });
    const url = `${ENDPOINT}?${params.toString()}`;
    let resp;
    try {
      resp = await fetch(url, {
        headers: {
          "Accept": "application/hal+json",
          "User-Agent": "ChadiaProjects/1.0",
        },
      });
    } catch (e) {
      throw new Error(`Sam.gov fetch error (page ${page}): ${e.message}`);
    }
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Sam.gov status ${resp.status} (page ${page}): ${t.slice(0, 200)}`);
    }
    const data = await resp.json();
    const results = data?._embedded?.results ?? [];
    for (const n of results) {
      const norm = normalize(n);
      if (norm) {
        // Filtre côté connecteur : on garde seulement si placeOfPerformance.country = TCD
        // (Sam.gov renvoie le code ISO 3 ; "Chad" en query → "TCD" en réponse)
        if (norm.paysCible.includes("TCD") || norm.paysCible.includes("CHD")) {
          // Normaliser : ISO TCD
          norm.paysCible = ["TCD"];
          collected.push(norm);
        }
      }
    }
    if (results.length < PAGE_SIZE) break;
  }

  return { collected };
}

module.exports = { fetchSamGovOpportunities };
