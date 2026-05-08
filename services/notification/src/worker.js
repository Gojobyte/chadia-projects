const { PrismaClient } = require("./generated/prisma");
const cron = require("node-cron");

const prisma = new PrismaClient();
const TENDER_SERVICE_URL = process.env.TENDER_SERVICE_URL || "http://localhost:3002";

async function processOutbox() {
  try {
    const events = await prisma.$queryRaw`
      SELECT * FROM tender.outbox_events WHERE processed = false ORDER BY "createdAt" ASC LIMIT 50
    `;
    for (const event of events) {
      try {
        await handleEvent(event);
        await prisma.$executeRaw`
          UPDATE tender.outbox_events SET processed = true, "processedAt" = NOW() WHERE id = ${event.id}
        `;
      } catch (e) {
        console.error(`Failed to process event ${event.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error("Outbox processing error:", e.message);
  }
}

async function handleEvent(event) {
  const { eventType, payload } = event;
  switch (eventType) {
    case "tender.published": {
      // Notify subscribers
      const subs = await prisma.abonnement.findMany({
        where: { actif: true, OR: [{ typeFiltre: "bailleur", valeurFiltre: payload.bailleurId }, { typeFiltre: "secteur", valeurFiltre: payload.secteur }] },
      });
      if (subs.length > 0) {
        await prisma.notification.createMany({
          data: subs.map(s => ({
            userId: s.userId,
            type: "tender.published",
            titre: `Nouvel appel d'offre: ${payload.titre || payload.reference}`,
            message: `Un nouvel appel d'offre a ete publie`,
            lien: `/appels-offres/${payload.id}`,
          })),
        });
      }
      break;
    }
    case "tender.attributed": {
      await prisma.notification.create({
        data: {
          userId: "system",
          type: "tender.attributed",
          titre: `Marche attribue: ${payload.reference || payload.id}`,
          message: `Le marche a ete attribue a ${payload.fournisseurNom} pour ${payload.montant} FCFA`,
          lien: `/appels-offres/${payload.id}`,
        },
      });
      break;
    }
    case "submission.received": {
      await prisma.notification.create({
        data: {
          userId: "system",
          type: "submission.received",
          titre: `Nouvelle soumission`,
          message: `Une nouvelle soumission a ete recue pour l'appel d'offre ${payload.appelOffreId}`,
          lien: `/soumissions/${payload.id}`,
        },
      });
      break;
    }
  }
}

// Run every 10 seconds
cron.schedule("*/10 * * * * *", processOutbox);
console.log("Notification worker started — processing outbox every 10s");
