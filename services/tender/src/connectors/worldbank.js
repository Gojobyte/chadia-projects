// =====================================================================
// Connecteur Banque Mondiale — Procurement Notices
// =====================================================================
// API publique (sans clé) :
//   GET https://search.worldbank.org/api/procnotices?qterm=Chad&format=json
//
// La query `qterm=Chad` matche le mot "Chad" dans tous les champs, donc
// on filtre côté nous sur `project_ctry_name === "Chad"` pour ne garder
// que les notices effectivement rattachées à un projet au Tchad.
//
// On garde toutes les notices publiées sur les 24 derniers mois (la BM
// publie en français et en anglais ; on conserve les deux).

const ENDPOINT = "https://search.worldbank.org/api/procnotices";

const PAGE_SIZE = 100;
const MAX_PAGES = 3; // 300 max par run
const LOOKBACK_MONTHS = 24;

// Notice type WB → typeFinancement CHADIA
function inferTypeFinancement(noticeType) {
  const v = (noticeType || "").toLowerCase();
  if (v.includes("expression of interest") || v.includes("manifestation")) return "CONSULTATION";
  if (v.includes("consulting")) return "CONSULTATION";
  if (v.includes("works") || v.includes("travaux")) return "MARCHE_TRAVAUX";
  if (v.includes("goods") || v.includes("fournit")) return "MARCHE_FOURNITURES";
  if (v.includes("services")) return "MARCHE_SERVICE";
  if (v.includes("contract award")) return "MARCHE_SERVICE"; // déjà attribué
  return "AUTRE";
}

// procurement_group → secteur lisible
function inferSecteur(procurementGroup, procurementMethodName) {
  const m = (procurementMethodName || "").toLowerCase();
  if (m.includes("consultant")) return "Consulting & assistance technique";
  switch (procurementGroup) {
    case "CW": return "Travaux civils";
    case "GO": return "Fournitures & biens";
    case "CS": return "Services de consultance";
    case "NC": return "Services hors-consultance";
    default: return null;
  }
}

// URL publique d'une notice : utilise le format projects.worldbank.org
function buildPublicUrl(id) {
  return `https://projects.worldbank.org/en/projects-operations/procurement-detail/${id}`;
}

// Table de décodage des entités HTML nommées les plus fréquentes.
// On couvre les caractères français + ponctuation typographique + symboles.
const HTML_ENTITIES = {
  // ASCII de base
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  // Voyelles accentuées français
  Aacute: "Á", aacute: "á", Agrave: "À", agrave: "à", Acirc: "Â", acirc: "â", Atilde: "Ã", atilde: "ã", Auml: "Ä", auml: "ä", Aring: "Å", aring: "å",
  Eacute: "É", eacute: "é", Egrave: "È", egrave: "è", Ecirc: "Ê", ecirc: "ê", Euml: "Ë", euml: "ë",
  Iacute: "Í", iacute: "í", Igrave: "Ì", igrave: "ì", Icirc: "Î", icirc: "î", Iuml: "Ï", iuml: "ï",
  Oacute: "Ó", oacute: "ó", Ograve: "Ò", ograve: "ò", Ocirc: "Ô", ocirc: "ô", Otilde: "Õ", otilde: "õ", Ouml: "Ö", ouml: "ö",
  Uacute: "Ú", uacute: "ú", Ugrave: "Ù", ugrave: "ù", Ucirc: "Û", ucirc: "û", Uuml: "Ü", uuml: "ü",
  Yacute: "Ý", yacute: "ý", yuml: "ÿ",
  Ccedil: "Ç", ccedil: "ç",
  Ntilde: "Ñ", ntilde: "ñ",
  szlig: "ß",
  // Ligatures + œ/Œ
  OElig: "Œ", oelig: "œ", AElig: "Æ", aelig: "æ",
  // Ponctuation typographique
  laquo: "«", raquo: "»",
  lsquo: "'", rsquo: "'", sbquo: "‚",
  ldquo: "“", rdquo: "”", bdquo: "„",
  hellip: "…", mdash: "—", ndash: "–",
  // Symboles
  deg: "°", micro: "µ", para: "¶", sect: "§", copy: "©", reg: "®", trade: "™",
  euro: "€", pound: "£", yen: "¥", cent: "¢",
  middot: "·", bull: "•",
  iexcl: "¡", iquest: "¿",
  plusmn: "±", times: "×", divide: "÷",
  // Espaces / sauts
  ensp: " ", emsp: " ", thinsp: " ", zwj: "", zwnj: "",
};

// Décode les entités HTML nommées et numériques (&#123; / &#x7B;)
function decodeHtmlEntities(s) {
  if (!s) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => Object.prototype.hasOwnProperty.call(HTML_ENTITIES, name) ? HTML_ENTITIES[name] : m);
}

// Nettoyage HTML : strip + décodage entités + normalisation des espaces
function stripHtml(html) {
  if (!html) return null;
  let s = String(html);
  // Convertir <br> et </p> en sauts de ligne avant strip
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/p>/gi, "\n\n");
  // Strip toutes les balises restantes
  s = s.replace(/<[^>]+>/g, "");
  // Décoder TOUTES les entités HTML (nommées + numériques)
  s = decodeHtmlEntities(s);
  // Normaliser les whitespaces : tabulations → espace, lignes vides multiples → une seule
  s = s.replace(/\t+/g, " ");
  s = s.replace(/[  ]{2,}/g, " ");
  s = s.replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

// ---------------------------------------------------------------------
function normalize(notice) {
  if (notice.project_ctry_name !== "Chad") return null;
  if (notice.notice_status && notice.notice_status !== "Published") return null;

  const id = notice.id;
  if (!id) return null;

  const titre = notice.bid_description?.trim() || notice.project_name || `Notice WB ${id}`;
  const description = stripHtml(notice.notice_text) || notice.bid_description || null;

  return {
    sourceConnector: "WORLDBANK",
    sourceId: String(id),
    sourceUrl: buildPublicUrl(id),
    bailleurNom: "Banque Mondiale",
    titre: titre.length > 200 ? titre.slice(0, 197) + "..." : titre,
    description,
    secteur: inferSecteur(notice.procurement_group, notice.procurement_method_name),
    typeFinancement: inferTypeFinancement(notice.notice_type),
    paysCible: ["TCD"],
    region: null,
    devise: "USD",
    montantEstime: null,
    datePublication: notice.submission_date ? new Date(notice.submission_date).toISOString() : null,
    dateLimiteDepot: notice.submission_deadline_date ? new Date(notice.submission_deadline_date).toISOString() : null,
    tags: [notice.procurement_method_code, notice.notice_lang_name].filter(Boolean),
    rawPayload: notice,
  };
}

// ---------------------------------------------------------------------
async function fetchWorldBankOpportunities(/* opts */) {
  const collected = [];
  const lookbackDate = new Date();
  lookbackDate.setMonth(lookbackDate.getMonth() - LOOKBACK_MONTHS);
  const strdate = lookbackDate.toISOString().slice(0, 10);

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      qterm: "Chad",
      format: "json",
      rows: String(PAGE_SIZE),
      os: String((page - 1) * PAGE_SIZE),
      srt: "noticedate",
      order: "desc",
      strdate,
    });
    const url = `${ENDPOINT}?${params.toString()}`;
    let resp;
    try {
      resp = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "ChadiaProjects/1.0" } });
    } catch (e) {
      throw new Error(`World Bank fetch error (page ${page}): ${e.message}`);
    }
    if (!resp.ok) {
      throw new Error(`World Bank status ${resp.status} (page ${page})`);
    }
    const data = await resp.json();
    const notices = data.procnotices || [];
    let foundChadOnThisPage = false;
    for (const n of notices) {
      const norm = normalize(n);
      if (norm) {
        collected.push(norm);
        foundChadOnThisPage = true;
      }
    }
    if (notices.length < PAGE_SIZE) break;
    // Optimisation : si on a parcouru une page entière sans aucune notice
    // Tchad, on n'attend rien des pages plus anciennes — on s'arrête.
    if (!foundChadOnThisPage && page >= 2) break;
  }

  return { collected };
}

module.exports = { fetchWorldBankOpportunities };
