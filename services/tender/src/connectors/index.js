// =====================================================================
// Orchestrateur de connecteurs de veille
// =====================================================================
// Chaque connecteur (ted.js, samgov.js…) expose une fonction
// `fetchXxxOpportunities()` qui retourne `{ collected: [normalizedOpp], ... }`.
// Cet orchestrateur appelle un connecteur par nom, upsert les opportunités
// en DB en utilisant la clé unique (sourceConnector, sourceId), et retourne
// un rapport synthétique.
//
// Convention : on n'écrase JAMAIS le statut d'une opportunité déjà décidée
// par CHADIA. Si une notice TED est rafraîchie alors qu'elle est marquée
// IGNOREE ou CANDIDATEE, on met juste à jour les métadonnées (titre, deadline…)
// sans toucher au statut.

const { fetchTedOpportunities } = require("./ted");
const { fetchSamGovOpportunities } = require("./samgov");
const { fetchWorldBankOpportunities } = require("./worldbank");
const { fetchUndpOpportunities } = require("./undp");
const { fetchUngmOpportunities } = require("./ungm");
const { fetchBadOpportunities } = require("./bad");
const { translateOpportunity, isEnabled: isTranslateEnabled } = require("./translate");

// Chaque clé doit correspondre à une valeur de l'enum OpportuniteSource
// dans le schéma Prisma. L'ordre est purement cosmétique (ordre d'exécution
// du cron : on commence par TED qui est le plus rapide).
const CONNECTORS = {
  TED: fetchTedOpportunities,
  SAM_GOV: fetchSamGovOpportunities,
  WORLDBANK: fetchWorldBankOpportunities,
  UNDP: fetchUndpOpportunities,
  UNGM: fetchUngmOpportunities,
  BAD: fetchBadOpportunities,
};

// Garde-fou côté orchestrateur : on n'enregistre QUE les opportunités
// qui mentionnent le Tchad dans leur place-of-performance. Les notices
// régionales qui n'incluent pas TCD sont ignorées même si un connecteur
// les ramène par erreur.
const REQUIRED_COUNTRY = "TCD";

function isInScope(opp) {
  const list = Array.isArray(opp.paysCible) ? opp.paysCible : [];
  return list.includes(REQUIRED_COUNTRY);
}

// ---------------------------------------------------------------------
async function runConnector(prisma, name, opts = {}) {
  const fn = CONNECTORS[name];
  if (!fn) throw new Error(`Connecteur inconnu : ${name}`);

  const start = Date.now();
  let collected = [];
  try {
    const result = await fn(opts);
    collected = result.collected ?? [];
  } catch (e) {
    return {
      ok: false,
      connector: name,
      error: e.message,
      durationMs: Date.now() - start,
      counts: { fetched: 0, created: 0, updated: 0, untouched: 0 },
    };
  }

  let created = 0;
  let updated = 0;
  let untouched = 0;
  let skipped = 0;
  let translated = 0;

  for (const opp of collected) {
    if (!isInScope(opp)) { skipped++; continue; }

    // Vérifier si on a déjà traduit cette opportunité dans le passé.
    // Critère : la clé rawPayload._chadia.translated existe → on saute la traduction.
    let alreadyTranslated = false;
    try {
      const existingRaw = await prisma.opportunite.findUnique({
        where: { sourceConnector_sourceId: { sourceConnector: opp.sourceConnector, sourceId: opp.sourceId } },
        select: { rawPayload: true },
      });
      const flag = existingRaw?.rawPayload?._chadia?.translated;
      if (flag) alreadyTranslated = true;
    } catch { /* nouvelle opportunité ou autre erreur, on ignore */ }

    if (!alreadyTranslated && isTranslateEnabled()) {
      try {
        const t = await translateOpportunity({ titre: opp.titre, description: opp.description });
        if (t.translated) {
          opp.titre = t.titre;
          opp.description = t.description;
          // On stocke les métadonnées de traduction dans rawPayload._chadia
          // pour éviter de re-traduire à la prochaine synchro.
          opp.rawPayload = {
            ...(opp.rawPayload || {}),
            _chadia: {
              translated: true,
              langueOriginale: t.langueOriginale,
              titreOriginal: t.original?.titre || null,
              descriptionOriginale: t.original?.description || null,
              translatedAt: new Date().toISOString(),
              provider: "DeepL",
            },
          };
          translated++;
        }
      } catch (e) {
        console.warn(`[connector ${name}] traduction échouée pour ${opp.sourceId}: ${e.message}`);
      }
    }
    // Préparation du payload upsert.
    // Update : on n'écrase JAMAIS `statut` ni `decideePar`/`decideeAt`.
    // Create : on enregistre tel quel, statut par défaut NOUVELLE.
    const updateData = {
      titre: opp.titre,
      description: opp.description ?? null,
      secteur: opp.secteur ?? null,
      typeFinancement: opp.typeFinancement ?? "AUTRE",
      paysCible: opp.paysCible ?? [],
      region: opp.region ?? null,
      montantEstime: opp.montantEstime ?? null,
      devise: opp.devise ?? "EUR",
      datePublication: opp.datePublication ? new Date(opp.datePublication) : null,
      dateLimiteDepot: opp.dateLimiteDepot ? new Date(opp.dateLimiteDepot) : null,
      sourceUrl: opp.sourceUrl ?? null,
      bailleurNom: opp.bailleurNom ?? null,
      tags: opp.tags ?? [],
      rawPayload: opp.rawPayload ?? null,
    };
    const createData = {
      ...updateData,
      sourceConnector: opp.sourceConnector,
      sourceId: opp.sourceId,
    };

    try {
      // upsert via la clé unique composée (sourceConnector, sourceId)
      const existing = await prisma.opportunite.findUnique({
        where: { sourceConnector_sourceId: { sourceConnector: opp.sourceConnector, sourceId: opp.sourceId } },
        select: { id: true, statut: true },
      });
      if (existing) {
        // Auto-expiration si la deadline est dépassée et la décision n'a pas été
        // déjà prise par CHADIA. Sinon on laisse le statut intact.
        const isExpired = updateData.dateLimiteDepot
          && updateData.dateLimiteDepot.getTime() < Date.now();
        const shouldExpire = isExpired
          && (existing.statut === "NOUVELLE" || existing.statut === "A_ETUDIER");
        await prisma.opportunite.update({
          where: { id: existing.id },
          data: shouldExpire ? { ...updateData, statut: "EXPIREE" } : updateData,
        });
        updated++;
      } else {
        const isExpired = updateData.dateLimiteDepot
          && updateData.dateLimiteDepot.getTime() < Date.now();
        await prisma.opportunite.create({
          data: { ...createData, statut: isExpired ? "EXPIREE" : "NOUVELLE" },
        });
        created++;
      }
    } catch (e) {
      console.warn(`[connector ${name}] upsert failed for ${opp.sourceId}: ${e.message}`);
      untouched++;
    }
  }

  return {
    ok: true,
    connector: name,
    durationMs: Date.now() - start,
    counts: { fetched: collected.length, created, updated, untouched, skipped, translated },
  };
}

async function runAllConnectors(prisma, opts = {}) {
  const reports = [];
  for (const name of Object.keys(CONNECTORS)) {
    reports.push(await runConnector(prisma, name, opts));
  }
  return reports;
}

module.exports = { runConnector, runAllConnectors, CONNECTORS };
