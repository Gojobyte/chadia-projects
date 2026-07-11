// =====================================================================
// Helper Playwright partagé entre les connecteurs (UNDP, UNGM, BAD…)
// =====================================================================
// On garde UN seul browser Chromium pour toute la durée du runConnector :
// launcher Chromium coûte ~1 seconde et ~200 Mo de RAM, donc on évite de
// le faire deux fois pour rien.
//
// Convention : chaque connecteur appelle `getBrowser()`, ouvre son propre
// `context`/`page`, et appelle `releaseBrowser()` à la fin. Quand plus
// personne ne l'utilise (compteur à 0), on ferme le browser.

const { chromium } = require("playwright");

let browser = null;
let refCount = 0;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 ChadiaProjects/1.0 (chadiaong@gmail.com) — veille AAP Tchad";

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      // Args pour fonctionnement dans un container Linux
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  refCount++;
  return browser;
}

async function releaseBrowser() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && browser) {
    try { await browser.close(); } catch { /* ignore */ }
    browser = null;
  }
}

/**
 * Crée un contexte navigateur avec un User-Agent personnalisé et
 * une politique de timeouts raisonnable. Les sites institutionnels
 * peuvent être très lents (BAD, UNDP) — on met 30s par défaut.
 */
async function newContext(opts = {}) {
  const b = await getBrowser();
  return b.newContext({
    userAgent: opts.userAgent || DEFAULT_USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: opts.locale || "en-US",
    timezoneId: "Africa/Ndjamena",
    extraHTTPHeaders: opts.extraHTTPHeaders || {},
  });
}

module.exports = {
  getBrowser,
  releaseBrowser,
  newContext,
  DEFAULT_TIMEOUT_MS: 30_000,
};
