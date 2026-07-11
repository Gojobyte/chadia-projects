// =====================================================================
// Connecteur UNGM — UN Global Marketplace (www.ungm.org)
// =====================================================================
// UNGM agrège tous les appels d'offres du système ONU. C'est une SPA
// Knockout.js, mais en pratique l'endpoint POST /Public/Notice/Search
// retourne directement du HTML avec les notices — donc on peut tout
// faire en fetch + cheerio (pas besoin de Playwright).
//
// Stratégie :
//   1. GET / pour récupérer le cookie de session
//   2. POST /Public/Notice/Search avec Countries=[2332] + DeadlineFrom=aujourd'hui
//   3. Parse le HTML, extrait les data-noticeid
//   4. Pour chaque notice : GET /Public/Notice/{id} pour récupérer
//      le détail (description, pays bénéficiaires, agence, type)
//   5. Filtre : on ne garde que les notices dont la liste de pays
//      contient explicitement le Tchad (sinon "Multiple destinations"
//      à 50 pays remplit le pipeline)
//
// L'ID UNGM du Tchad est 2332 (observé dans le <select> "Countries"
// de la page de recherche).

const cheerio = require("cheerio");

const BASE = "https://www.ungm.org";
const CHAD_COUNTRY_ID = "2332";
const FETCH_TIMEOUT_MS = 25_000;

const HEADERS_GET = {
  "User-Agent": "Mozilla/5.0 ChadiaProjects/1.0 (chadiaong@gmail.com)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// Format de date attendu par UNGM dans le payload de Search : "DD-Mon-YYYY"
function ungmDateFormat(d = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(d.getUTCDate()).padStart(2, "0")}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

// Parse une date UNGM, ex "13-May-2026 00:00 (GMT -10.00)"
function parseUngmDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(
    /(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})(?:\s+(\d{1,2}):(\d{2}))?(?:\s*\(GMT\s*([+-]?\d+(?:\.\d+)?)\s*\))?/i,
  );
  if (!m) return null;
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const mo = months[m[2].toLowerCase().slice(0, 3)];
  if (mo == null) return null;
  const day = parseInt(m[1], 10);
  const year = parseInt(m[3], 10);
  const hour = m[4] ? parseInt(m[4], 10) : 0;
  const minute = m[5] ? parseInt(m[5], 10) : 0;
  const tzOffsetHours = m[6] ? parseFloat(m[6]) : 0; // offset GMT exprimé en heures
  // UTC = local - offset
  const utcMs = Date.UTC(year, mo, day, hour, minute) - tzOffsetHours * 3600 * 1000;
  return new Date(utcMs).toISOString();
}

// Mappe le type UNGM → enum CHADIA
function mapType(typeStr) {
  const t = (typeStr || "").toLowerCase();
  if (/grant|subvent|funding|gfp/.test(t)) return "SUBVENTION";
  if (/individual|consult|ic\b/.test(t)) return "CONSULTATION";
  if (/invitation to bid|itb|works|travaux/.test(t)) return "MARCHE_TRAVAUX";
  if (/rfq|request for quotation|goods|fournitures/.test(t)) return "MARCHE_FOURNITURES";
  if (/eoi|expression of interest|rfei|rfp|tender|service/.test(t)) return "MARCHE_SERVICE";
  return "MARCHE_SERVICE";
}

// ---------------------------------------------------------------------
// Étape 1 : ouvrir le site pour récupérer un cookie de session
// ---------------------------------------------------------------------
async function bootstrapSession() {
  const r = await fetchWithTimeout(`${BASE}/Public/Notice`, { headers: HEADERS_GET });
  const setCookie = r.headers.get("set-cookie") || "";
  // Le serveur peut renvoyer plusieurs Set-Cookie séparés par virgules.
  // On garde le pair "key=value" de chacun.
  const cookies = setCookie.split(/,(?=\s*[A-Za-z0-9_-]+=)/g)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean);
  return cookies.join("; ");
}

// ---------------------------------------------------------------------
// Étape 2 : POST sur l'endpoint Search
// ---------------------------------------------------------------------
async function searchNotices(cookieHeader, { pageIndex = 0, pageSize = 50 } = {}) {
  const payload = {
    PageIndex: pageIndex,
    PageSize: pageSize,
    Title: "",
    Description: "",
    Reference: "",
    PublishedFrom: "",
    PublishedTo: "",
    DeadlineFrom: ungmDateFormat(),   // ≥ aujourd'hui pour exclure les expirées
    DeadlineTo: "",
    Countries: [CHAD_COUNTRY_ID],
    Agencies: [],
    UNSPSCs: [],
    NoticeTypes: [],
    SortField: "Deadline",
    SortAscending: true,
    isPicker: false,
  };
  const r = await fetchWithTimeout(`${BASE}/Public/Notice/Search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "*/*",
      "User-Agent": HEADERS_GET["User-Agent"],
      "Cookie": cookieHeader,
      "Referer": `${BASE}/Public/Notice`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`UNGM Search ${r.status}`);
  return r.text();
}

// ---------------------------------------------------------------------
// Parsing de la liste
// ---------------------------------------------------------------------
function extractListing(html) {
  const $ = cheerio.load(html);
  const byId = new Map();
  // Chaque notice a 2 lignes : la principale + une row "btnEOI" plus bas.
  // On garde la principale (classe 'notice-table').
  $('[data-noticeid].notice-table').each((_, el) => {
    const row = $(el);
    const id = row.attr("data-noticeid");
    if (!id || byId.has(id)) return;

    const titre = row.find(".ungm-title").first().text().trim() || null;
    const detailLink = row.find('a[href*="/Public/Notice/"]').first().attr("href") || `/Public/Notice/${id}`;

    // Le texte concaténé contient : "Titre Open in a new window 13-May-2026 00:00 (GMT -10.00) <unused> 31-Mar-2026 IFC Invitation to bid WBP - 1 Multiple destinations"
    const rawText = row.text().replace(/\s+/g, " ").trim();
    // Cherche les 2 dates (deadline puis published) — pattern "DD-Mon-YYYY"
    const dates = rawText.match(/\d{1,2}-[A-Za-z]{3}-\d{4}(?:\s+\d{1,2}:\d{2}\s*\(GMT[^)]+\))?/g) || [];
    const deadlineStr = dates[0] || null;
    const publishedStr = dates[1] || null;

    byId.set(id, { id, titre, detailUrl: `${BASE}${detailLink}`, deadlineStr, publishedStr, rawText });
  });
  return [...byId.values()];
}

// ---------------------------------------------------------------------
// Parsing du détail (page /Public/Notice/{id})
// ---------------------------------------------------------------------
function extractDetail(html) {
  const $ = cheerio.load(html);
  const result = {
    titre: null,
    description: null,
    reference: null,
    agency: null,
    noticeType: null,
    publishedStr: null,
    deadlineStr: null,
    countries: [],
    isChad: false,
    isMultipleDestinations: false,
  };

  result.titre = $("h1").first().text().trim() || null;

  // Structure observée :
  //   <div class="row">
  //     <span class="label">Reference:</span>
  //     <span class="value">UNDP-TCD-00841</span>
  //   </div>
  $("span.label").each((_, el) => {
    const lbl = $(el).text().trim().replace(/:$/, "").toLowerCase();
    // La valeur est dans le span.value frère
    const val = $(el).nextAll("span.value").first().text().replace(/\s+/g, " ").trim()
             || $(el).next("span").text().replace(/\s+/g, " ").trim();
    if (!val) return;
    switch (lbl) {
      case "reference":
        result.reference = val; break;
      case "un organization":
      case "organization":
        result.agency = val; break;
      case "notice type":
      case "type":
        result.noticeType = val; break;
      case "published on":
        result.publishedStr = val; break;
      case "deadline on":
        result.deadlineStr = val; break;
      case "beneficiary country":
      case "beneficiary countries or territories":
        if (/multiple destinations/i.test(val)) {
          result.isMultipleDestinations = true;
        }
        if (/\bchad\b/i.test(val)) {
          result.isChad = true;
        }
        result.countries = val.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        break;
      default:
        break;
    }
  });

  // Note : pour les notices "Multiple destinations", la liste détaillée
  // des pays n'est pas dans le HTML initial (chargée par un onglet AJAX).
  // On ne tente pas de la résoudre — l'utilisateur peut consulter ces
  // notices directement sur UNGM en cliquant sur le lien externe.
  // → on n'active isChad que sur les Chad explicites.

  // Description : <span class="label">Description</span> suivi d'un <span class="value">
  // qui peut contenir du HTML mis en forme
  $("span.label").each((_, el) => {
    if (/^description/i.test($(el).text().trim())) {
      const valEl = $(el).nextAll("span.value, .value, div.value").first();
      const desc = (valEl.length ? valEl : $(el).next()).text().replace(/\s+/g, " ").trim();
      if (desc && desc.length > 30 && !result.description) {
        result.description = desc.slice(0, 8000);
      }
    }
  });

  // Fallback : bloc texte le plus long
  if (!result.description) {
    let best = null;
    $(".row .value, .notice-content, main p, main div").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length > 200 && (!best || t.length > best.length)) best = t;
    });
    if (best) result.description = best.slice(0, 8000);
  }

  return result;
}

// ---------------------------------------------------------------------
async function fetchUngmOpportunities() {
  const collected = [];
  let cookieHeader;
  try {
    cookieHeader = await bootstrapSession();
  } catch (e) {
    console.warn(`[UNGM] bootstrap échoué : ${e.message}`);
    return { collected };
  }

  let html;
  try {
    html = await searchNotices(cookieHeader, { pageSize: 50 });
  } catch (e) {
    console.warn(`[UNGM] search échoué : ${e.message}`);
    return { collected };
  }

  const items = extractListing(html);

  for (const it of items) {
    // Récupère le détail
    let detail = {};
    try {
      const rd = await fetchWithTimeout(it.detailUrl, {
        headers: { ...HEADERS_GET, "Cookie": cookieHeader },
      });
      if (rd.ok) {
        const dh = await rd.text();
        detail = extractDetail(dh);
      }
    } catch (e) {
      console.warn(`[UNGM] détail ${it.id} échoué : ${e.message}`);
    }

    // Filtre dur : on ne garde que les notices dont la liste de pays
    // bénéficiaires contient explicitement Chad, OU "Multiple destinations"
    // avec une mention "Chad" trouvée dans la page (déjà géré par isChad).
    // Le filtre Countries=2332 d'UNGM est trop large (il renvoie des
    // notices Africa Region où le Tchad n'est PAS explicite). On rejette
    // ces cas, sinon on inonde la base avec des notices hors scope.
    const isExplicitChad = detail.isChad === true;
    const isRegional = detail.isMultipleDestinations === true;
    if (!isExplicitChad) {
      // Pas de mention explicite du Tchad : on saute.
      continue;
    }

    const tags = [];
    if (detail.reference) tags.push(detail.reference);
    if (isRegional) tags.push("Multi-pays");

    collected.push({
      sourceConnector: "UNGM",
      sourceId: it.id,
      sourceUrl: it.detailUrl,
      bailleurNom: detail.agency
        ? `${detail.agency} (via UNGM)`
        : "Système ONU (UNGM)",
      titre: detail.titre || it.titre || `Notice UNGM ${it.id}`,
      description: detail.description,
      secteur: null,
      typeFinancement: mapType(detail.noticeType),
      paysCible: ["TCD"],
      region: isRegional ? "Multi-pays" : null,
      devise: "USD",
      montantEstime: null,
      datePublication: parseUngmDate(detail.publishedStr || it.publishedStr),
      dateLimiteDepot: parseUngmDate(detail.deadlineStr || it.deadlineStr),
      tags,
      rawPayload: {
        reference: detail.reference,
        agency: detail.agency,
        noticeType: detail.noticeType,
        isExplicitChad,
        isMultipleDestinations: isRegional,
        countries: detail.countries,
      },
    });
  }

  return { collected };
}

module.exports = { fetchUngmOpportunities };
