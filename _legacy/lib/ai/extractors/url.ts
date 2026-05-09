/**
 * Extracteur URL — récupère et nettoie le contenu d'une page web.
 *
 * Utilise @mozilla/readability + jsdom pour extraire le contenu
 * principal d'une page (enlève navigation, publicités, etc.).
 */

// Imports dynamiques pour éviter le chargement de jsdom au build time
// jsdom essaie de charger @napi-rs/canvas qui n'est pas disponible

const MAX_CHARS = 200_000;

interface URLExtractionResult {
  text: string;
  title: string;
  url: string;
  truncated: boolean;
}

export async function extractTextFromURL(
  url: string
): Promise<URLExtractionResult> {
  // Fetch la page
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CHADIA-Projects/1.0 (grant-management-tool)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000), // 15 secondes max
  });

  if (!response.ok) {
    throw new Error(`Impossible de charger l'URL : ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Parser avec jsdom + Readability (import dynamique)
  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error("Impossible d'extraire le contenu de cette page. Essayez avec un PDF.");
  }

  let text = article.textContent.trim();
  const truncated = text.length > MAX_CHARS;

  if (truncated) {
    text = text.slice(0, MAX_CHARS) + "\n\n[... contenu tronqué ...]";
  }

  return {
    text,
    title: article.title ?? "",
    url,
    truncated,
  };
}
