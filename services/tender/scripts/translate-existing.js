// =====================================================================
// Script one-shot — traduit en français les opportunités déjà en DB
// =====================================================================
// Usage (depuis le container tender) :
//   node scripts/translate-existing.js
//
// Parcourt toutes les Opportunite dont rawPayload._chadia.translated
// n'est pas défini, appelle DeepL pour titre + description, et met à jour
// en DB. Les opportunités déjà en français (heuristique) sont ignorées.

const { PrismaClient } = require("../src/generated/prisma");
const { translateOpportunity, isEnabled, getUsage } = require("../src/connectors/translate");

const prisma = new PrismaClient();

async function main() {
  if (!isEnabled()) {
    console.error("DEEPL_API_KEY absente. Mets-la dans .env.prod et relance.");
    process.exit(1);
  }

  const usage = await getUsage();
  if (usage) {
    console.log(`Quota DeepL : ${usage.character_count} / ${usage.character_limit} caractères utilisés`);
  }

  const all = await prisma.opportunite.findMany({
    select: { id: true, sourceConnector: true, sourceId: true, titre: true, description: true, rawPayload: true },
  });
  console.log(`Total opportunités : ${all.length}`);

  const toProcess = all.filter((o) => !o.rawPayload?._chadia?.translated);
  console.log(`À traiter (non encore traduites) : ${toProcess.length}`);

  let translated = 0;
  let skippedFrench = 0;
  let errors = 0;

  for (const opp of toProcess) {
    try {
      const t = await translateOpportunity({ titre: opp.titre, description: opp.description });
      if (!t.translated) {
        if (t.reason === "looks-french") skippedFrench++;
        else console.warn(`  ${opp.sourceConnector}/${opp.sourceId} non traduit : ${t.reason}`);
        continue;
      }

      const newRaw = {
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

      await prisma.opportunite.update({
        where: { id: opp.id },
        data: { titre: t.titre, description: t.description, rawPayload: newRaw },
      });
      translated++;
      if (translated % 10 === 0) console.log(`  ${translated} traduites...`);

      // Pause anti-rate-limit. La doc DeepL Free dit "5 req/s" mais en
      // pratique on observe des 429 dès qu'on tape sous 500ms. On reste
      // confortablement au-dessus.
      await new Promise((r) => setTimeout(r, 700));
    } catch (e) {
      errors++;
      console.error(`  ERREUR ${opp.sourceConnector}/${opp.sourceId} : ${e.message}`);
    }
  }

  console.log("\n=== Récap ===");
  console.log(`Traduites    : ${translated}`);
  console.log(`Déjà en FR   : ${skippedFrench}`);
  console.log(`Erreurs      : ${errors}`);

  const usageAfter = await getUsage();
  if (usageAfter) {
    console.log(`Quota DeepL après : ${usageAfter.character_count} / ${usageAfter.character_limit}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
