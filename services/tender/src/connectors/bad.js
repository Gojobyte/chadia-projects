// =====================================================================
// Connecteur BAD — Banque africaine de développement (afdb.org)
// =====================================================================
// La BAD n'expose pas d'API publique pour ses appels d'offres et son
// site est derrière Cloudflare (403 sur tout fetch HTTP simple).
// → Playwright avec un User-Agent navigateur réel est nécessaire.
//
// LIMITATION CONNUE : Cloudflare flag agressivement les IPs des serveurs
// cloud (Hetzner, OVH, AWS, etc.). En pratique :
//   - Page 0 : passe (cache CDN)
//   - Page 1+ : 403, l'IP est bannie pour ~15 minutes
// Pour un déploiement en production il faudrait un proxy résidentiel,
// ou consulter cette source manuellement.
//
// Structure des URLs notices (quand on y a accès) :
//   /[en|fr]/documents/(eoi|gpn|ssr|sso|ami|advert)-{pays}-{titre}
// On parcourt la liste paginée /fr/projects-and-operations/procurement
// et on filtre celles dont le slug contient "chad" ou "tchad".

const { newContext, releaseBrowser, DEFAULT_TIMEOUT_MS } = require("./browser");

const BASE = "https://www.afdb.org";
// Cloudflare est très agressif sur afdb.org : 2 requests/sec et il nous flag.
// On limite à 5 pages et on espace de 6 secondes pour rester sous le radar.
const PAGINATION_PAGES = 5;
const REQUEST_DELAY_MS = 6_000;
const NOTICE_URL_REGEX = /\/documents\/(eoi|gpn|ssr|sso|ami|advert|notice|gpa)-/i;
const CHAD_KEYWORDS = /\b(chad|tchad)\b/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Map des préfixes BAD vers nos enums
function mapTypeFromPrefix(slug) {
  const m = slug.toLowerCase().match(/\/documents\/([a-z]+)-/);
  if (!m) return "MARCHE_SERVICE";
  switch (m[1]) {
    case "ami":              // Avis de Manifestation d'Intérêt
    case "eoi":              // Expression of Interest
      return "CONSULTATION";
    case "gpn":              // General Procurement Notice
    case "advert":
      return "MARCHE_SERVICE";
    case "ssr":              // Single Source Recruitment
    case "sso":              // Single Source
      return "CONSULTATION";
    case "gpa":
      return "MARCHE_FOURNITURES";
    default:
      return "MARCHE_SERVICE";
  }
}

async function fetchBadOpportunities() {
  const collected = [];
  const seen = new Set();

  const ctx = await newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

  try {
    // ---- Étape 1 : parcourir les pages de la liste FR
    for (let pageIdx = 0; pageIdx < PAGINATION_PAGES; pageIdx++) {
      // Délai entre les pages (sauf la première) pour éviter le rate-limit
      // Cloudflare. Une fois flaggué, l'IP est bannie pendant plusieurs minutes.
      if (pageIdx > 0) await sleep(REQUEST_DELAY_MS);

      const url = pageIdx === 0
        ? `${BASE}/fr/projects-and-operations/procurement`
        : `${BASE}/fr/projects-and-operations/procurement?page=${pageIdx}`;
      try {
        const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
        if (!resp || !resp.ok()) {
          console.warn(`[BAD] page ${pageIdx} : statut ${resp?.status()} — arrêt`);
          break;
        }
      } catch (e) {
        console.warn(`[BAD] page ${pageIdx} : ${e.message}`);
        break;
      }

      // Extraire tous les liens notice de la page
      const links = await page.$$eval('a[href*="/documents/"]', (els) => {
        return els.map((a) => ({
          href: a.href,
          text: (a.innerText || "").trim(),
        }));
      });

      const chadLinks = links.filter(
        (l) =>
          /\/documents\/(eoi|gpn|ssr|sso|ami|advert|notice|gpa)-/i.test(l.href)
          && /\b(chad|tchad)\b/i.test(l.href + " " + l.text),
      );
      console.log(`[BAD] page ${pageIdx}: ${links.length} doc links, ${chadLinks.length} Chad-related`);

      for (const lk of chadLinks) {
        // L'id natif = le slug après /documents/
        const slugMatch = lk.href.match(/\/documents\/([^/?#]+)/);
        if (!slugMatch) continue;
        const slug = slugMatch[1];
        if (seen.has(slug)) continue;
        seen.add(slug);

        // ---- Étape 2 : visiter la page de détail (avec délai)
        await sleep(REQUEST_DELAY_MS);
        let detail = { description: null, datePublication: null, deadline: null };
        try {
          await page.goto(lk.href, { waitUntil: "domcontentloaded" });
          detail = await page.evaluate(() => {
            // La page note de BAD : le titre est dans h1, la description
            // dans .field--name-body, les métadonnées dans des span dédiés.
            const titre = document.querySelector("h1")?.innerText?.trim() || null;
            const body = document.querySelector(".field--name-body, .field-name-body, .node__content");
            const description = body?.innerText?.replace(/\s+/g, " ")?.trim()?.slice(0, 8000) || null;

            // Date publication : <time datetime="…"> en haut de la page
            const timeEl = document.querySelector("time[datetime]");
            const datePublication = timeEl?.getAttribute("datetime") || null;

            // Date limite : souvent dans le texte sous forme "Date limite : DD Month YYYY"
            // ou "Deadline: DD Month YYYY". On essaie d'extraire.
            const allText = document.body.innerText;
            const dlMatch = allText.match(/(?:date limite|deadline|date de cl[oô]ture)[\s:]*([0-9]{1,2}[\s/-][a-zA-Zéûôîè]+[\s/-][0-9]{4}|\d{4}-\d{2}-\d{2})/i);

            return {
              titre,
              description,
              datePublication,
              deadline: dlMatch ? dlMatch[1] : null,
            };
          });
        } catch (e) {
          console.warn(`[BAD] détail ${slug} : ${e.message}`);
        }

        collected.push({
          sourceConnector: "BAD",
          sourceId: slug,
          sourceUrl: lk.href,
          bailleurNom: "Banque africaine de développement (BAD)",
          titre: detail.titre || lk.text || slug,
          description: detail.description,
          secteur: null,
          typeFinancement: mapTypeFromPrefix(lk.href),
          paysCible: ["TCD"],
          region: null,
          devise: "USD",
          montantEstime: null,
          datePublication: detail.datePublication ? new Date(detail.datePublication).toISOString() : null,
          dateLimiteDepot: parseBadDeadline(detail.deadline),
          tags: [],
          rawPayload: { slug, listingText: lk.text, ...detail },
        });
      }
    }

    return { collected };
  } finally {
    await ctx.close().catch(() => {});
    await releaseBrowser();
  }
}

// Parse une date en français "15 mai 2026" ou ISO "2026-05-15"
function parseBadDeadline(s) {
  if (!s) return null;
  // ISO
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // Format "DD month YYYY"
  const months = {
    janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const m = String(s).trim().match(/(\d{1,2})[\s/-]([a-zA-Zéûôîè]+)[\s/-](\d{4})/i);
  if (m) {
    const mo = months[m[2].toLowerCase()];
    if (mo != null) {
      return new Date(Date.UTC(parseInt(m[3], 10), mo, parseInt(m[1], 10))).toISOString();
    }
  }
  return null;
}

module.exports = { fetchBadOpportunities };
