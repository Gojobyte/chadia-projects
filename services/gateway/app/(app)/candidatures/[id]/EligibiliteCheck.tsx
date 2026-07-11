import Link from "next/link";
import type { OrgProfile } from "../../organisation/page";

interface Critere {
  label: string;
  description?: string;
  obligatoire?: boolean;
}

/** Document de la bibliothèque, version minimale utilisée par le scan. */
interface LibraryDoc {
  id: string;
  nom: string;
  description?: string | null;
  tags: string[];
  type: string;
  category: string;
  mimeType?: string | null;
}

interface Props {
  profile: OrgProfile | null;
  eligibilite: (string | Critere)[];
  /** Documents de la bibliothèque à scanner pour trouver des preuves
   *  qu'un critère est rempli (ex: critère "PEAS" → doc "Manuel PEAS"). */
  libraryDocs?: LibraryDoc[];
}

/** Statut du check pour un critère donné. */
type CheckStatus = "match" | "partial" | "missing" | "unknown";

interface CheckResult {
  status: CheckStatus;
  /** Tokens du profil qui matchent — détaillent pourquoi on a un match. */
  matched: string[];
  /** Documents de la bibliothèque qui semblent attester le critère. */
  evidenceDocs: LibraryDoc[];
  hint?: string;
}

function normalize(c: string | Critere): Critere {
  if (typeof c === "string") return { label: c };
  return c;
}

/** Découpe une phrase en mots-clés normalisés. */
function tokenize(text: string): string[] {
  const stop = new Set([
    "le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "à", "au",
    "aux", "en", "dans", "sur", "pour", "par", "avec", "sans", "ce", "ces",
    "que", "qui", "quoi", "dont", "est", "sont", "etre", "être", "avoir",
    "plus", "moins", "an", "ans", "annee", "annees", "doit", "doivent",
    "minimum", "minimal", "majeur", "majeure", "etc",
    "soumissionnaire", "candidat", "candidate", "demandeur", "postulant",
    "organisation", "organisme", "entite", "structure",
  ]);
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stop.has(t));
}

/** Cherche dans les documents de la bibliothèque ceux qui matchent au moins
 *  un mot-clé du critère. Retourne les 3 plus pertinents (tri par nb de
 *  tokens matchés desc). */
function findEvidenceDocs(critere: Critere, libraryDocs: LibraryDoc[]): LibraryDoc[] {
  const tokens = tokenize(`${critere.label} ${critere.description ?? ""}`);
  if (tokens.length === 0) return [];

  const scored = libraryDocs
    .map((doc) => {
      const corpus = [
        doc.nom,
        doc.description ?? "",
        ...(doc.tags ?? []),
        doc.type,
        doc.category,
      ].join(" ");
      const corpusTokens = new Set(tokenize(corpus));
      const matched = tokens.filter((t) => corpusTokens.has(t));
      return { doc, score: matched.length };
    })
    .filter((s) => s.score >= 1)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((s) => s.doc);
}

/** Scan combiné profil + documents pour un critère donné. */
function checkOne(critere: Critere, profile: OrgProfile | null, libraryDocs: LibraryDoc[]): CheckResult {
  const tokens = tokenize(`${critere.label} ${critere.description ?? ""}`);
  if (tokens.length === 0) {
    return { status: "unknown", matched: [], evidenceDocs: [] };
  }

  const evidenceDocs = findEvidenceDocs(critere, libraryDocs);

  // Si pas de profil, on se base uniquement sur les documents.
  if (!profile) {
    if (evidenceDocs.length >= 2) return { status: "match", matched: [], evidenceDocs };
    if (evidenceDocs.length === 1) return { status: "partial", matched: [], evidenceDocs };
    return { status: "unknown", matched: [], evidenceDocs };
  }

  // Corpus textuel du profil.
  const corpus = [
    profile.descriptionLibre ?? "",
    profile.statutJuridique ?? "",
    profile.recepisseONG ?? "",
    ...(profile.domaines ?? []),
    ...(profile.paysIntervention ?? []),
    ...(profile.bailleursReferences ?? []),
    ...(profile.agrements ?? []),
    ...(profile.partenairesRecurrents ?? []),
  ].join(" ");
  const corpusTokens = new Set(tokenize(corpus));
  const profileMatched = tokens.filter((t) => corpusTokens.has(t));

  // Cas numériques : "X ans d'expérience", "X salariés", "X EUR/FCFA"
  const yearsMatch = critere.label.match(/(\d+)\s*ans?/i);
  if (yearsMatch && profile.experienceMoyenneAnnees) {
    const requis = parseInt(yearsMatch[1], 10);
    if (profile.experienceMoyenneAnnees >= requis) {
      return { status: "match", matched: [...profileMatched, `${profile.experienceMoyenneAnnees} ans ≥ ${requis} requis`], evidenceDocs };
    } else {
      return { status: "missing", matched: profileMatched, evidenceDocs, hint: `Expérience renseignée : ${profile.experienceMoyenneAnnees} ans, requis : ${requis} ans` };
    }
  }
  const staffMatch = critere.label.match(/(\d+)\s*(salari[ée]s?|employ[ée]s?|agents?|personnels?|collaborateurs?)/i);
  if (staffMatch && profile.effectifs) {
    const requis = parseInt(staffMatch[1], 10);
    if (profile.effectifs >= requis) return { status: "match", matched: [`${profile.effectifs} salariés ≥ ${requis} requis`], evidenceDocs };
    return { status: "missing", matched: profileMatched, evidenceDocs, hint: `Effectifs : ${profile.effectifs}, requis : ${requis}` };
  }
  const budgetMatch = critere.label.match(/(\d{3,})/);
  if (budgetMatch && /budget|chiffre/i.test(critere.label) && profile.budgetAnnuelEur) {
    const requis = parseInt(budgetMatch[1], 10);
    if (profile.budgetAnnuelEur >= requis) return { status: "match", matched: [`${profile.budgetAnnuelEur} EUR ≥ ${requis} requis`], evidenceDocs };
  }
  const fcfaMatch = critere.label.match(/(\d[\d\s]{2,})\s*(fcfa|f cfa|xof|xaf)/i);
  if (fcfaMatch && profile.budgetAnnuelEur) {
    const requisFcfa = parseInt(fcfaMatch[1].replace(/\s/g, ""), 10);
    const budgetFcfa = Math.round(profile.budgetAnnuelEur * 655.957);
    if (budgetFcfa >= requisFcfa) {
      return { status: "match", matched: [`${budgetFcfa.toLocaleString("fr-FR")} FCFA ≥ ${requisFcfa.toLocaleString("fr-FR")} requis`], evidenceDocs };
    }
  }

  // Combinaison profil + documents pour le verdict final.
  // - Profile fort (≥2 tokens) OU ≥1 doc trouvé → match
  // - Profile faible (1 token) OU 1 doc seulement → partial
  // - Rien → unknown
  const profileStrong = profileMatched.length >= 2;
  const profileWeak = profileMatched.length === 1;
  const hasDocs = evidenceDocs.length > 0;

  if (profileStrong && hasDocs) return { status: "match", matched: profileMatched, evidenceDocs };
  if (profileStrong || evidenceDocs.length >= 2) return { status: "match", matched: profileMatched, evidenceDocs };
  if (profileWeak || hasDocs) return { status: "partial", matched: profileMatched, evidenceDocs };
  return { status: "unknown", matched: [], evidenceDocs };
}

export function EligibiliteCheck({ profile, eligibilite, libraryDocs = [] }: Props) {
  if (!eligibilite || eligibilite.length === 0) return null;

  // Cas extrême : ni profil renseigné, ni documents en bibliothèque
  // → on incite à remplir le profil (le plus impactant).
  if (!profile && libraryDocs.length === 0) {
    return (
      <section className="elig-check">
        <header className="ec-h">
          <div className="ec-eb">Éligibilité · vérification</div>
          <h3 className="ec-t">
            Comparez l&apos;AO à votre <em>profil organisation</em>
          </h3>
        </header>
        <div className="ec-empty">
          <p style={{ fontSize: 13, color: "var(--color-sepia)", margin: "0 0 12px" }}>
            Aucun profil organisation n&apos;est encore renseigné, et la bibliothèque est vide.
            Renseignez le profil et téléversez vos documents pour activer la vérification automatique
            d&apos;éligibilité aux {eligibilite.length} critère{eligibilite.length > 1 ? "s" : ""} de cet AO.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/organisation" className="btn btn--accent btn--sm">
              <i className="ph ph-buildings" aria-hidden="true"></i> Renseigner le profil
            </Link>
            <Link href="/bibliotheque" className="btn btn--ghost btn--sm">
              <i className="ph ph-files" aria-hidden="true"></i> Voir la bibliothèque
            </Link>
          </div>
        </div>
        <style>{eligCheckStyles}</style>
      </section>
    );
  }

  // Scan dynamique multi-sources : pour chaque critère extrait par l'IA,
  // on combine matching profil + recherche dans la bibliothèque.
  const items = eligibilite.map((c) => {
    const critere = normalize(c);
    return { critere, check: checkOne(critere, profile, libraryDocs) };
  });

  const matchCount = items.filter((i) => i.check.status === "match").length;
  const missingCount = items.filter((i) => i.check.status === "missing").length;
  const unknownCount = items.filter((i) => i.check.status === "unknown").length;
  const partialCount = items.filter((i) => i.check.status === "partial").length;

  // Couverture documentaire : combien de critères ont au moins 1 preuve doc.
  const withDocs = items.filter((i) => i.check.evidenceDocs.length > 0).length;
  const totalEvidenceDocs = new Set(items.flatMap((i) => i.check.evidenceDocs.map((d) => d.id))).size;

  // Score global pondéré.
  const score = items.length > 0
    ? Math.round(((matchCount + partialCount * 0.5) / items.length) * 100)
    : 0;

  // Verdict global affiché à l'utilisateur.
  const verdict = score >= 80 ? "high" : score >= 50 ? "medium" : score >= 20 ? "low" : "critical";
  const verdictLabel = {
    high: "Candidature solide",
    medium: "Candidature plausible",
    low: "Risque élevé d'inéligibilité",
    critical: "Très probablement inéligible",
  }[verdict];
  const verdictColor = {
    high: "var(--color-success)",
    medium: "var(--color-warning)",
    low: "var(--color-warning)",
    critical: "var(--color-danger)",
  }[verdict];

  // Complétude du profil (pour transparence sur la qualité du matching).
  const profileFields = profile ? [
    profile.statutJuridique?.trim(),
    profile.recepisseONG?.trim(),
    profile.descriptionLibre?.trim(),
    profile.effectifs ? "x" : "",
    profile.anneeCreation ? "x" : "",
    profile.budgetAnnuelEur ? "x" : "",
    profile.experienceMoyenneAnnees ? "x" : "",
    (profile.domaines?.length ?? 0) > 0 ? "x" : "",
    (profile.paysIntervention?.length ?? 0) > 0 ? "x" : "",
    (profile.bailleursReferences?.length ?? 0) > 0 ? "x" : "",
    (profile.agrements?.length ?? 0) > 0 ? "x" : "",
    (profile.partenairesRecurrents?.length ?? 0) > 0 ? "x" : "",
  ].filter(Boolean).length : 0;
  const profileCompleteness = profile ? Math.round((profileFields / 12) * 100) : 0;

  return (
    <section className="elig-check">
      <header className="ec-h">
        <div className="ec-eb">Éligibilité · scan automatique</div>
        <h3 className="ec-t">
          {score}% des critères <em>couverts</em>
        </h3>
        <div className="ec-summary">
          <span className="cnt match"><i className="ph ph-check-circle" aria-hidden="true"></i> {matchCount} validé{matchCount > 1 ? "s" : ""}</span>
          <span className="cnt partial"><i className="ph ph-circle-half" aria-hidden="true"></i> {partialCount} partiel{partialCount > 1 ? "s" : ""}</span>
          <span className="cnt missing"><i className="ph ph-x-circle" aria-hidden="true"></i> {missingCount} manquant{missingCount > 1 ? "s" : ""}</span>
          <span className="cnt unknown"><i className="ph ph-question" aria-hidden="true"></i> {unknownCount} indéterminé{unknownCount > 1 ? "s" : ""}</span>
        </div>
        {/* Bandeau verdict — couleur selon le niveau de confiance. */}
        <div className="ec-verdict" style={{ background: verdictColor + "1a", borderColor: verdictColor + "55", color: verdictColor }}>
          <i className={verdict === "high" ? "ph-fill ph-check-circle" : verdict === "critical" ? "ph-fill ph-x-circle" : "ph-fill ph-warning-circle"} aria-hidden="true"></i>
          <strong>{verdictLabel}</strong>
          <span style={{ fontWeight: 400, fontSize: 11, color: "var(--color-stone)" }}>
            · {withDocs}/{items.length} critères avec preuve documentaire · {totalEvidenceDocs} document{totalEvidenceDocs > 1 ? "s" : ""} mobilisé{totalEvidenceDocs > 1 ? "s" : ""}
          </span>
        </div>
        {profile ? (
          <div className="ec-profile-meta">
            <i className="ph ph-buildings" aria-hidden="true"></i>
            Profil ONG <strong>{profileCompleteness}% complet</strong>
            · Bibliothèque <strong>{libraryDocs.length} document{libraryDocs.length > 1 ? "s" : ""}</strong>
          </div>
        ) : null}
      </header>

      <ul className="ec-list">
        {items.map(({ critere, check }, i) => (
          <li key={i} className={`ec-item ${check.status}`}>
            <i
              className={`ph ${
                check.status === "match" ? "ph-check-circle"
                : check.status === "partial" ? "ph-circle-half"
                : check.status === "missing" ? "ph-x-circle"
                : "ph-question"
              }`}
              aria-hidden="true"
            ></i>
            <div className="ec-body">
              <div className="ec-label">
                {critere.label}
                {critere.obligatoire ? <span className="oblig">obligatoire</span> : null}
              </div>
              {check.matched.length > 0 ? (
                <div className="ec-hint">
                  <i className="ph ph-buildings" aria-hidden="true" style={{ marginRight: 4, fontSize: 11 }}></i>
                  Profil : {check.matched.join(" · ")}
                </div>
              ) : null}
              {check.hint ? <div className="ec-hint warn">{check.hint}</div> : null}
              {/* Preuves documentaires : liens cliquables vers les docs */}
              {check.evidenceDocs.length > 0 ? (
                <div className="ec-evidence">
                  <i className="ph ph-paperclip" aria-hidden="true"></i>
                  <span>Documents attestants :</span>
                  {check.evidenceDocs.map((doc) => (
                    <a
                      key={doc.id}
                      href={`/api/documents/${doc.id}/file`}
                      data-doc-id={doc.id}
                      target="_blank"
                      rel="noreferrer"
                      className="ec-doc-pill"
                      title={doc.description ?? doc.nom}
                    >
                      <i className="ph ph-file-pdf" aria-hidden="true"></i> {doc.nom}
                    </a>
                  ))}
                </div>
              ) : null}
              {check.status === "missing" || check.status === "unknown" ? (
                <div className="ec-action">
                  <i className="ph ph-lightbulb" aria-hidden="true"></i>
                  <span>
                    {check.status === "missing" ? "Critère non rempli : " : "Aucune preuve trouvée : "}
                    <Link href="/bibliotheque" style={{ color: "var(--color-terracotta)", textDecoration: "underline" }}>
                      téléverser un document
                    </Link>
                    {" ou "}
                    <Link href="/organisation" style={{ color: "var(--color-terracotta)", textDecoration: "underline" }}>
                      enrichir le profil
                    </Link>
                  </span>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <footer className="ec-foot">
        <Link href="/organisation" style={{ fontSize: 11.5, color: "var(--color-terracotta)", textDecoration: "none", marginRight: 16 }}>
          <i className="ph ph-pencil-simple" aria-hidden="true"></i> Affiner le profil
        </Link>
        <Link href="/bibliotheque" style={{ fontSize: 11.5, color: "var(--color-terracotta)", textDecoration: "none" }}>
          <i className="ph ph-files" aria-hidden="true"></i> Ouvrir la bibliothèque
        </Link>
      </footer>

      <style>{eligCheckStyles}</style>
    </section>
  );
}

const eligCheckStyles = `
  .elig-check {
    background: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: 10px;
    padding: 18px 20px;
    margin-top: 16px;
  }
  .ec-h { margin-bottom: 14px; }
  .ec-eb {
    font-size: 10px;
    letter-spacing: 0.14em;
    color: var(--color-stone);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .ec-t {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 400;
    color: var(--color-ink);
    margin: 0 0 8px;
  }
  .ec-t em { color: var(--color-terracotta); font-style: italic; }
  .ec-summary {
    display: flex; gap: 12px; flex-wrap: wrap;
    font-size: 12px;
  }
  .ec-summary .cnt {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: var(--font-mono);
  }
  .ec-summary .match { color: var(--color-success); }
  .ec-summary .partial { color: var(--color-warning); }
  .ec-summary .missing { color: var(--color-danger); }
  .ec-summary .unknown { color: var(--color-stone); }

  .ec-verdict {
    margin-top: 10px;
    padding: 8px 12px;
    border: 1px solid;
    border-radius: 6px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ec-verdict i { font-size: 18px; }

  .ec-profile-meta {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--color-line);
    font-size: 11px;
    color: var(--color-stone);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ec-profile-meta strong { color: var(--color-ink); font-weight: 600; }
  .ec-profile-meta i { color: var(--color-terracotta); }

  .ec-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
  .ec-item {
    display: flex; gap: 10px;
    padding: 12px;
    background: var(--color-page);
    border: 1px solid var(--color-line);
    border-radius: 6px;
    font-size: 12.5px;
  }
  .ec-item > i { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .ec-item.match { border-color: rgba(46, 125, 50, 0.3); background: rgba(46, 125, 50, 0.04); }
  .ec-item.match > i { color: var(--color-success); }
  .ec-item.partial { border-color: rgba(237, 108, 2, 0.3); background: rgba(237, 108, 2, 0.04); }
  .ec-item.partial > i { color: var(--color-warning); }
  .ec-item.missing { border-color: rgba(198, 40, 40, 0.3); background: rgba(198, 40, 40, 0.04); }
  .ec-item.missing > i { color: var(--color-danger); }
  .ec-item.unknown > i { color: var(--color-stone); }
  .ec-body { flex: 1; min-width: 0; }
  .ec-label { color: var(--color-ink); line-height: 1.35; }
  .ec-label .oblig {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 6px;
    background: var(--color-terracotta-soft);
    color: var(--color-terracotta);
    border-radius: 3px;
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 500;
  }
  .ec-hint { font-size: 11px; color: var(--color-stone); margin-top: 4px; }
  .ec-hint.warn { color: var(--color-warning); }

  .ec-evidence {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
    font-size: 11px;
    color: var(--color-stone);
  }
  .ec-evidence > i { color: var(--color-terracotta); margin-right: 2px; }
  .ec-evidence > span:nth-of-type(1) { margin-right: 4px; }
  .ec-doc-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--color-canvas);
    border: 1px solid var(--color-line);
    border-radius: 12px;
    color: var(--color-ink);
    text-decoration: none;
    font-size: 11px;
    transition: all 150ms;
  }
  .ec-doc-pill:hover { background: var(--color-surface); border-color: var(--color-terracotta); color: var(--color-terracotta); }
  .ec-doc-pill i { color: var(--color-terracotta); font-size: 12px; }

  .ec-action {
    margin-top: 6px;
    font-size: 11px;
    color: var(--color-stone);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ec-action i { color: var(--color-warning); }

  .ec-foot { margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--color-line); text-align: right; }
`;
