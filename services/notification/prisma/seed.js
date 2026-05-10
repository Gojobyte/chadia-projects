/**
 * Seed du service notification.
 *
 * Crée quelques notifications de démonstration pour l'admin technique. Ne
 * touche pas aux utilisateurs réels (les notifications réelles seront
 * créées via les outbox events des autres services).
 */

const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

// Le service notification ne connaît pas les emails (pas de relation FK
// avec le schéma auth) — on lui passe directement l'id auth qui est aussi
// utilisé dans les JWT. Pour la démo on appelle le service auth via HTTP.
async function getAdminUserId() {
  const url = process.env.AUTH_SERVICE_URL || "http://auth-service:3001";
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@ong-chadia.com";
  const svcToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!svcToken) {
    console.warn("INTERNAL_SERVICE_TOKEN absent — abandon du seed notifications");
    return null;
  }
  try {
    const resp = await fetch(`${url}/auth/users?email=${encodeURIComponent(email)}`, {
      headers: { "x-service-token": svcToken },
    });
    const data = await resp.json();
    return data?.user?.id ?? null;
  } catch (e) {
    console.error("Impossible de récupérer l'admin user:", e.message);
    return null;
  }
}

const TEMPLATES = [
  {
    type: "projet.created",
    titre: "Nouveau projet créé",
    message: "Le projet PRJ-2026-08 \"Réponse aux inondations dans le bassin du Batha\" vient d'être ajouté au portefeuille.",
    lien: "/projets",
    ago: 5,
  },
  {
    type: "tender.published",
    titre: "Appel d'offres publié",
    message: "AO-2026-094 sur le registre public OCDS. Les fournisseurs catégorisés ont été notifiés.",
    lien: "/appels-offres",
    ago: 60,
  },
  {
    type: "submission.received",
    titre: "Nouvelle soumission reçue",
    message: "SAHEL Hydro SARL a déposé une offre pour AO-2026-094. Pli scellé jusqu'à l'ouverture du 15 mai.",
    lien: "/soumissions",
    ago: 180,
  },
  {
    type: "deadline.reminder",
    titre: "Échéance dans 18 jours",
    message: "Le projet PRJ-2026-08 arrive à échéance. Pensez à préparer le rapport intermédiaire.",
    lien: "/projets",
    ago: 360,
  },
  {
    type: "document.uploaded",
    titre: "Document téléversé",
    message: "Un rapport d'activité a été ajouté à la bibliothèque (catégorie Rapports).",
    lien: "/bibliotheque",
    ago: 720,
  },
  {
    type: "tender.attributed",
    titre: "Marché attribué",
    message: "AO-2026-091 (Fourniture de kits scolaires) attribué à Papeterie du Logone pour 7,8 M FCFA.",
    lien: "/marches",
    ago: 1440,
    lu: true,
  },
];

async function main() {
  const userId = await getAdminUserId();
  if (!userId) {
    console.log("Pas d'admin user trouvé → seed sauté");
    return;
  }

  // Cleanup éventuel des notifications de démo précédentes
  const existing = await prisma.notification.count({ where: { userId } });
  if (existing > 50) {
    console.log(`Déjà ${existing} notifications pour ${userId}, seed sauté`);
    return;
  }

  let created = 0;
  for (const t of TEMPLATES) {
    const createdAt = new Date(Date.now() - t.ago * 60 * 1000);
    await prisma.notification.create({
      data: {
        userId,
        type: t.type,
        titre: t.titre,
        message: t.message,
        lien: t.lien,
        lu: t.lu ?? false,
        createdAt,
      },
    });
    created += 1;
  }
  console.log(`${created} notifications seedées pour user ${userId}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
