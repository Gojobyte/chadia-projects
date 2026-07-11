// =====================================================================
// Cron de veille — déclenchement périodique des connecteurs
// =====================================================================
// Désactivable via la variable d'environnement DISABLE_CRON=1 (utile
// en développement local pour éviter de mitrailler les APIs externes).
//
// Schedule : toutes les 6h ("0 */6 * * *"), démarrage immédiat au boot
// si la variable RUN_CRON_AT_STARTUP=1 (sinon on attend le premier tick
// pour ne pas saturer le démarrage en prod).

const cron = require("node-cron");

function startCron({ prisma, runAllConnectors }) {
  if (process.env.DISABLE_CRON === "1") {
    console.log("[cron] désactivé via DISABLE_CRON=1");
    return null;
  }

  const schedule = process.env.CRON_SCHEDULE || "0 */6 * * *";
  if (!cron.validate(schedule)) {
    console.warn(`[cron] expression invalide "${schedule}", désactivation`);
    return null;
  }

  const task = cron.schedule(schedule, async () => {
    const start = Date.now();
    console.log(`[cron] tick ${new Date().toISOString()} — démarrage runAllConnectors`);
    try {
      const reports = await runAllConnectors(prisma);
      const totals = reports.reduce((acc, r) => {
        acc.fetched += r.counts.fetched;
        acc.created += r.counts.created;
        acc.updated += r.counts.updated;
        return acc;
      }, { fetched: 0, created: 0, updated: 0 });
      console.log(`[cron] terminé en ${Date.now() - start}ms — fetched=${totals.fetched} created=${totals.created} updated=${totals.updated}`);
    } catch (e) {
      console.error(`[cron] erreur : ${e.message}`);
    }
  });

  console.log(`[cron] schedule actif : "${schedule}"`);

  if (process.env.RUN_CRON_AT_STARTUP === "1") {
    setTimeout(async () => {
      console.log("[cron] RUN_CRON_AT_STARTUP=1, exécution immédiate");
      try {
        await runAllConnectors(prisma);
      } catch (e) {
        console.error(`[cron] startup run erreur : ${e.message}`);
      }
    }, 5_000);
  }

  return task;
}

module.exports = { startCron };
