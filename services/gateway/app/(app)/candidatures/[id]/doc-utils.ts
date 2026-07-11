// ============================================================
// Helpers pour l'éditeur de pièces (DocsWorkspace).
// Extraits de DocsWorkspace.tsx pour alléger le composant client
// et permettre la réutilisation depuis ScoreDetailModal ou autres
// composants futurs.
// ============================================================

export interface PieceLike {
  id: string;
  nom: string;
  description?: string | null;
  categorie: "A" | "B" | "C" | "D" | "E";
  type?: string;
  format?: string;
}

/**
 * Exécute une commande document.execCommand (déprécié mais largement
 * supporté). Utilisé par la toolbar de mise en forme.
 * Une migration vers Tiptap/Lexical est prévue dans une itération future.
 */
export function exec(cmd: string): void {
  try {
    document.execCommand(cmd);
  } catch {
    /* ignore */
  }
}

/** Compte les mots d'un HTML (en stripant les balises). Format français. */
export function wordCount(html: string): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "0";
  return new Intl.NumberFormat("fr-FR").format(text.split(" ").length);
}

/** Extrait la liste des titres h1/h2/h3 pour générer un plan. */
export function extractHeadings(html: string): Array<{ level: number; text: string }> {
  if (typeof document === "undefined") return [];
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return Array.from(tmp.querySelectorAll("h1, h2, h3")).map((el) => ({
    level: Number(el.tagName.slice(1)),
    text: (el.textContent || "").trim(),
  }));
}

/** Échappe les caractères HTML pour empêcher l'injection au moment de la
 *  conversion texte → HTML. NE remplace PAS DOMPurify (qui sanitize l'HTML
 *  arbitraire) — c'est juste pour générer du HTML safe à partir de texte. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Conversion minimale texte → HTML : double-saut de ligne devient un
 * paragraphe, les titres ## ou "3.1 ..." deviennent des h2.
 * Utilisé pour afficher en mode édition un noteConcept brut (texte) qui
 * existait avant l'autosave HTML.
 */
export function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => {
      const t = para.trim();
      if (!t) return "";
      if (/^#+\s/.test(t)) {
        return `<h2>${escapeHtml(t.replace(/^#+\s/, ""))}</h2>`;
      }
      if (/^\d+\.\d+\s/.test(t)) {
        const [num, ...rest] = t.split(/\s+/);
        return `<h2><span class="num">${num}</span>${escapeHtml(rest.join(" "))}</h2>`;
      }
      return `<p>${escapeHtml(t)}</p>`;
    })
    .join("");
}

/**
 * Template de démarrage selon la catégorie de la pièce. Affiché quand
 * une pièce n'a aucun contenu encore.
 */
export function defaultTemplate(p: PieceLike): string {
  const head = `
    <header class="doc-letterhead">
      <div class="lh-l"><span class="mk">C</span><span>CHADIA Projects · ONG tchadienne</span></div>
      <div>${escapeHtml(p.categorie)} · Confidentiel</div>
    </header>
    <h1>${escapeHtml(p.nom)}</h1>
    <div class="doc-sub">${escapeHtml(p.description || p.type || "Document")}</div>
  `;

  if (p.categorie === "C") {
    return (
      head +
      `<h2><span class="num">1.</span>Contexte et justification</h2>
      <p>Décrivez ici le contexte de l'intervention, la problématique, les bénéficiaires et l'impact attendu. Vous pouvez utiliser l'<span class="hl">assistant IA</span> pour générer un brouillon à partir de l'analyse de l'AO.</p>
      <h2><span class="num">2.</span>Approche méthodologique</h2>
      <p>Présentez les phases, le calendrier et les modalités opérationnelles.</p>
      <ul>
        <li><strong>Phase 1 — Diagnostic &amp; ciblage</strong></li>
        <li><strong>Phase 2 — Mobilisation des équipes</strong></li>
        <li><strong>Phase 3 — Mise en œuvre</strong></li>
        <li><strong>Phase 4 — Évaluation &amp; transfert</strong></li>
      </ul>`
    );
  }

  if (p.categorie === "D") {
    return (
      head +
      `<h2><span class="num">A.</span>Ressources humaines</h2>
      <p>Indiquez les postes, durées et salaires bruts par personne (en respectant les barèmes du bailleur).</p>
      <h2><span class="num">B.</span>Activités terrain</h2>
      <p>Kits hygiène, réhabilitations, formations comités : volumes et coûts unitaires.</p>
      <h2><span class="num">C.</span>Coûts indirects</h2>
      <p>Plafond PRAG UE : 7 %. Justification ligne par ligne.</p>`
    );
  }

  return (
    head +
    `<p>Contenu de la pièce <strong>${escapeHtml(p.nom)}</strong> à compléter.</p>
    <p>${escapeHtml(p.description || "")}</p>`
  );
}
