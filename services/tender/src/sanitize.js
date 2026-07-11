// Sanitization HTML côté serveur — défense en profondeur (P0 sécurité).
// Le client sanitize aussi avant l'envoi (DOMPurify), mais un attaquant peut
// contourner ça (devtools, monkey-patch, appel direct API). Donc on RE-sanitize
// systématiquement avant stockage et on conserve la même whitelist que côté
// client pour rester cohérent (cf services/gateway/.../DocsWorkspace.tsx:14-30).

const sanitizeHtml = require("sanitize-html");

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "strong", "em", "u", "s",
  "code", "pre", "blockquote",
  "ul", "ol", "li",
  "a", "img", "hr",
  "table", "thead", "tbody", "tr", "th", "td",
  "span", "div", // pour les blocs de structure (doc-letterhead, doc-sub, etc.)
];

const ALLOWED_ATTR = {
  // Limites par tag pour éviter les attributs dangereux globalement.
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
  "*": ["class", "id"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];

/**
 * Sanitize un fragment HTML en supprimant tout ce qui pourrait être un
 * vecteur XSS : tags script/iframe/object, attributs on*, javascript: URIs,
 * data: URIs (sauf images), style inline (peut contenir expression() ou url()).
 */
function sanitizeRichHtml(html) {
  if (typeof html !== "string") return "";
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      img: ["http", "https"], // pas de data: pour rester strict
    },
    // sanitize-html retire automatiquement les attributs on* et style inline
    // si pas dans allowedAttributes. Pas de configuration explicite nécessaire.
    disallowedTagsMode: "discard",
    // Force target=_blank externe à porter rel=noopener noreferrer
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

/**
 * Strip TOUT le HTML — garde uniquement le texte. Pour les champs qui ne
 * sont jamais censés contenir de balises (titre, description, commentaires).
 */
function stripAllHtml(text) {
  if (typeof text !== "string") return "";
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
}

module.exports = { sanitizeRichHtml, stripAllHtml };
