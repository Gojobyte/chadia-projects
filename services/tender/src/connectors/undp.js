// =====================================================================
// Connecteur UNDP (PNUD) — procurement-notices.undp.org
// =====================================================================
// Bonne surprise : malgré l'apparence SPA, le site UNDP rend toutes les
// notices côté serveur (ColdFusion) dans le HTML initial. Pas besoin de
// Playwright pour celui-là, un simple fetch + parsing cheerio suffit.
//
// La liste principale affiche les notices actives, paginées par pages
// de ~10. On parcourt les premières pages et on garde les notices dont
// le bureau pays est CHAD/TCD.
//
// Le détail d'une notice se trouve à
//   https://procurement-notices.undp.org/view_notice.cfm?notice_id=XXXX

const cheerio = require("cheerio");

const BASE = "https://procurement-notices.undp.org";
const MAX_PAGES = 25;      // ~250 notices parcourues max (les Tchad sont rares)
const PAGE_SIZE = 10;       // valeur observée sur le site
const FETCH_TIMEOUT_MS = 25_000;

function fetchWithTimeout(url, opts = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 ChadiaProjects/1.0 (chadiaong@gmail.com)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

// ---------------------------------------------------------------------
// Parsing : extrait la liste des cartes notices d'une page liste
// ---------------------------------------------------------------------
// Structure HTML réelle (observée 2026-05) :
//   <div class="vacanciesTable__row">
//     <div class="vacanciesTable__cell">
//       <div class="vacanciesTable__cell__label">Title</div>
//       <a href="view_notice.cfm?notice_id=123">…</a>
//     </div>
//     <div class="vacanciesTable__cell">
//       <div class="vacanciesTable__cell__label">Ref No</div>
//       <span>UNDP-TCD-00858</span>
//     </div>
//     <div class="vacanciesTable__cell">
//       <div class="vacanciesTable__cell__label">UNDP Office/Country</div>
//       <span>UNDP-TCD/CHAD</span>
//     </div>
//     <div class="vacanciesTable__cell">
//       <div class="vacanciesTable__cell__label">Process</div>
//       <span>RFP - Request for proposal</span>
//     </div>
//     <div class="vacanciesTable__cell">
//       <div class="vacanciesTable__cell__label">Deadline</div>
//       <span>15-May-2026</span>
//     </div>
//   </div>
function readCell(card, $, labelText) {
  let value = null;
  card.find(".vacanciesTable__cell").each((_, cell) => {
    const label = $(cell).find(".vacanciesTable__cell__label").text().trim();
    if (label.toLowerCase() === labelText.toLowerCase()) {
      // La valeur peut être un <span> OU un <a> (cas du titre)
      const span = $(cell).find("span").first().text().trim();
      const a = $(cell).find("a").first().text().trim();
      value = span || a || null;
    }
  });
  return value;
}

// Sur le listing, chaque ligne est un <a class="vacanciesTableLink"> qui
// pointe soit vers view_notice.cfm?notice_id=… (Procurement Notices),
// soit vers view_negotiation.cfm?nego_id=… (négociations / RFP en cours).
// Les deux types nous intéressent : la majorité des appels d'offres
// actifs sont en réalité des "negotiations" côté UNDP.
function readCellInLink(link, $, labelText) {
  let value = null;
  link.find(".vacanciesTable__cell").each((_, cell) => {
    const label = $(cell).find(".vacanciesTable__cell__label").text().trim();
    if (label.toLowerCase() === labelText.toLowerCase()) {
      // On clone et on retire le label, puis on prend ce qui reste comme texte.
      const cloned = $(cell).clone();
      cloned.find(".vacanciesTable__cell__label").remove();
      value = cloned.text().replace(/\s+/g, " ").trim();
    }
  });
  return value;
}

function extractListing(html) {
  const $ = cheerio.load(html);
  const items = [];

  $("a.vacanciesTableLink").each((_, el) => {
    const link = $(el);
    const href = link.attr("href") || "";
    const noticeMatch = href.match(/notice_id=(\d+)/);
    const negoMatch = href.match(/nego_id=(\d+)/);
    if (!noticeMatch && !negoMatch) return;

    const kind = noticeMatch ? "notice" : "nego";
    const nativeId = (noticeMatch || negoMatch)[1];
    // Préfixe pour éviter une collision entre notice_id=42 et nego_id=42
    const id = `${kind}_${nativeId}`;

    const titre = readCellInLink(link, $, "Title") || `Annonce UNDP ${id}`;
    const refNo = readCellInLink(link, $, "Ref No");
    const officeCountry = readCellInLink(link, $, "UNDP Office/Country") || "";
    const process = readCellInLink(link, $, "Process");
    const deadline = readCellInLink(link, $, "Deadline");
    const posted = readCellInLink(link, $, "Posted") || readCellInLink(link, $, "Posted On");

    // Le pays est après le "/" dans "UNDP-TCD/CHAD" ou "UNDP/GABON"
    const slashIdx = officeCountry.lastIndexOf("/");
    const countryName = (slashIdx >= 0
      ? officeCountry.slice(slashIdx + 1)
      : officeCountry
    ).trim().toUpperCase();

    // Code ISO si présent (ex : "UNDP-TCD-00858" → "TCD")
    const isoMatch = (refNo || "").match(/^UNDP-([A-Z]{3})-/);
    const isoCode = isoMatch ? isoMatch[1] : null;

    // URL absolue selon le type
    const url = noticeMatch
      ? `${BASE}/view_notice.cfm?notice_id=${nativeId}`
      : `${BASE}/view_negotiation.cfm?nego_id=${nativeId}`;

    items.push({
      id,
      kind,
      nativeId,
      titre,
      refNo,
      url,
      countryName,
      isoCode,
      process,
      deadline,
      posted,
    });
  });

  // Détection : a-t-on une page suivante ?
  const nextHref = $('a[href*="cur_page="]')
    .filter((_, el) => /next|suivant|>/i.test($(el).text()))
    .first()
    .attr("href");
  return { items, hasNext: !!nextHref };
}

// ---------------------------------------------------------------------
// Parsing : extrait le détail d'une page negotiation (view_negotiation.cfm)
// ---------------------------------------------------------------------
// Structure observée :
//   <h2>{titre de l'appel}</h2>
//   <h2>Introduction</h2>
//   <p|div>…texte de l'introduction sur plusieurs blocs…</p>
//   <h2>Documents :</h2>
//   …
// On capte le texte entre le h2 "Introduction" et le h2 suivant.
function extractDetail(html) {
  const $ = cheerio.load(html);

  // Titre = premier h2 (le h1 est généralement vide sur cette page)
  const titre = $("h1").first().text().trim() || $("h2").first().text().trim() || null;

  // Description = blocs entre h2 "Introduction" et h2 suivant
  let description = null;
  const intro = $("h2")
    .filter((_, el) => /introduction|background|description|overview/i.test($(el).text()))
    .first();
  if (intro.length) {
    const parts = [];
    let cur = intro.next();
    while (cur.length && cur.get(0).tagName !== "h2") {
      const t = cur.text().replace(/\s+/g, " ").trim();
      if (t) parts.push(t);
      cur = cur.next();
    }
    description = parts.join("\n\n").slice(0, 6000) || null;
  }

  return { titre, description };
}

// Parser de date robuste. UNDP envoie des formats variés et parfois
// mal formés, par exemple "25-May-2604:28 AM (New York time)" où
// l'année 2026 est collée à l'heure 04:28. On tente plusieurs patterns.
const MONTHS = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
};

function parseDate(s) {
  if (!s) return null;
  s = String(s).trim();

  // Format UNDP : "DD-Mon-YY" (toujours 2 chiffres pour l'année), parfois
  // collé directement à une heure sans séparateur :
  //   "11-May-26"           → posted
  //   "25-May-2604:28 AM"   → deadline (= 25 mai 2026 à 04:28 AM)
  //   "25-May-26 04:28 AM"  → variante propre
  // L'année est verrouillée à 2 chiffres pour éviter de manger "2604" en bloc.
  const m = s.match(/(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2})\s*(?:(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const mo = MONTHS[m[2].toLowerCase().slice(0, 3)];
    const year = 2000 + parseInt(m[3], 10);   // 26 → 2026
    let hour = m[4] ? parseInt(m[4], 10) : 0;
    const minute = m[5] ? parseInt(m[5], 10) : 0;
    const ampm = (m[6] || "").toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    if (mo != null) {
      return new Date(Date.UTC(year, mo, day, hour, minute)).toISOString();
    }
  }

  // Fallback : laisser Date natif essayer
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

// ---------------------------------------------------------------------
async function fetchUndpOpportunities() {
  const collected = [];
  const seen = new Set();

  // Parcourt les premières pages de la home
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? BASE + "/" : `${BASE}/?cur_page=${page}`;
    let html;
    try {
      const r = await fetchWithTimeout(url, { headers: HEADERS });
      if (!r.ok) break;
      html = await r.text();
    } catch (e) {
      console.warn(`[UNDP] page ${page} échouée : ${e.message}`);
      break;
    }

    const { items, hasNext } = extractListing(html);
    if (items.length === 0) break;

    // Filtre Tchad : on accepte CHAD, TCHAD, ou ISO TCD
    const chadItems = items.filter((it) =>
      it.isoCode === "TCD"
      || /(^|\s)(CHAD|TCHAD)(\s|$)/.test(it.countryName || "")
    );
    for (const it of chadItems) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);

      // Fetch le détail (pour récupérer la description longue)
      let detail = {};
      try {
        const r2 = await fetchWithTimeout(it.url, { headers: HEADERS });
        if (r2.ok) {
          const detailHtml = await r2.text();
          detail = extractDetail(detailHtml);
        }
      } catch { /* on continue sans détail */ }

      // Type de financement déduit du champ "Process" (RFP, IC, RFQ, ITB…)
      const proc = (it.process || detail.type || "").toLowerCase();
      const typeFinancement =
        /grant|subvent/i.test(proc) ? "SUBVENTION"
        : /^ic|individual contract|consult/i.test(proc) ? "CONSULTATION"
        : /itb|invitation to bid|travaux|works/i.test(proc) ? "MARCHE_TRAVAUX"
        : /rfq|fourniture|goods|supplies/i.test(proc) ? "MARCHE_FOURNITURES"
        : "MARCHE_SERVICE";

      collected.push({
        sourceConnector: "UNDP",
        sourceId: it.id,
        sourceUrl: it.url,
        bailleurNom: "PNUD — Bureau Tchad",
        titre: detail.titre || it.titre,
        description: detail.description || null,
        secteur: null,
        typeFinancement,
        paysCible: ["TCD"],
        region: null,
        devise: "USD",
        montantEstime: null,
        datePublication: parseDate(it.posted || detail.posted),
        dateLimiteDepot: parseDate(it.deadline || detail.deadline),
        tags: it.refNo ? [it.refNo] : [],
        rawPayload: { ...it, detail },
      });
    }

    if (!hasNext) break;
  }

  return { collected };
}

module.exports = { fetchUndpOpportunities };
