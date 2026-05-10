const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

// =====================================================================
// MEMBRES réels ONG CHADIA (acte du 15 octobre 2022)
// Identifiants par défaut : prenom.nom@ong-chadia.com / Chadia2026!
// À CHANGER au premier login en production.
// =====================================================================
const MEMBRES = [
  // ----- Conseil d'Administration -----
  {
    email: "khadidja.bouchoura@ong-chadia.com",
    name: "Khadidja Bouchoura Youssouf",
    fonction: "Présidente du Conseil d'administration",
    instance: "CA",
    role: "DIRECTEUR",
    zone: "N'Djaména",
    bio: "Préside le Conseil d'administration de l'ONG CHADIA. Veille à la conformité de l'organisation aux statuts.",
  },
  {
    email: "amine.moustapha@ong-chadia.com",
    name: "Amine Moustapha Saleh",
    fonction: "Vice-Président du Conseil d'administration",
    instance: "CA",
    role: "ADMIN",
    zone: "N'Djaména",
    bio: "Vice-Président du CA. Seconde la Présidente et supervise l'application des décisions au sein du Bureau Exécutif.",
  },
  {
    email: "salah.khastalani@ong-chadia.com",
    name: "Salah Khastalani",
    fonction: "Commissaire au Compte",
    instance: "CA",
    role: "FINANCIER",
    zone: "N'Djaména",
    bio: "Commissaire au Compte. Examine les états financiers et certifie la régularité des comptes annuels.",
  },

  // ----- Bureau Exécutif -----
  {
    email: "tidjani.salah@ong-chadia.com",
    name: "Tidjani SALAH",
    fonction: "Directeur Général · Coordinateur",
    instance: "BUREAU",
    role: "DIRECTEUR",
    zone: "N'Djaména",
    bio: "Coordonne l'ensemble des opérations de l'ONG. Représente CHADIA auprès des partenaires institutionnels (AUDA-NEPAD, ministères) et du secteur privé.",
  },
  {
    email: "amine.idriss@ong-chadia.com",
    name: "Amine Idriss",
    fonction: "Responsable de la communication",
    instance: "BUREAU",
    role: "MEMBRE",
    zone: "N'Djaména",
    bio: "Pilote la communication institutionnelle, les relations presse et le suivi des publications réglementaires.",
  },
  {
    email: "moustapha.hisseine@ong-chadia.com",
    name: "Moustapha Hisseine Ahmat",
    fonction: "Trésorier",
    instance: "BUREAU",
    role: "FINANCIER",
    zone: "N'Djaména",
    bio: "Trésorier du Bureau Exécutif. Suit la trésorerie, valide les engagements bancaires et garantit la disponibilité des fonds.",
  },
  {
    email: "brahim.mahamat@ong-chadia.com",
    name: "Brahim Mahamat ALI",
    fonction: "Secrétaire comptable",
    instance: "BUREAU",
    role: "ADMIN",
    zone: "N'Djaména",
    bio: "Tient la comptabilité quotidienne, archive les pièces justificatives et prépare les états financiers avant visa du cabinet expert-comptable.",
  },
];

async function main() {
  // Super-admin technique (compte de service pour l'administration de la plateforme)
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@ong-chadia.com";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "admin123";
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "DIRECTEUR", isActive: true },
    create: {
      email: adminEmail,
      name: "Administrateur plateforme",
      passwordHash: adminHash,
      role: "DIRECTEUR",
      fonction: "Administration technique",
      instance: "EXTERNE",
    },
  });
  console.log(`Super-admin: ${adminEmail}`);

  // Membres ONG CHADIA — mot de passe par défaut, à changer au premier login
  const defaultPwd = await bcrypt.hash("Chadia2026!", 12);
  for (const m of MEMBRES) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {
        name: m.name,
        fonction: m.fonction,
        instance: m.instance,
        role: m.role,
        zone: m.zone,
        bio: m.bio,
        isActive: true,
      },
      create: {
        email: m.email,
        name: m.name,
        passwordHash: defaultPwd,
        role: m.role,
        fonction: m.fonction,
        instance: m.instance,
        zone: m.zone,
        bio: m.bio,
      },
    });
    console.log(`  + ${m.name} (${m.instance})`);
  }
  console.log(`Membres CHADIA seedés: ${MEMBRES.length}`);

  // Tokens de service inter-services
  const services = [
    { name: "tender-service", scopes: ["tender:read", "tender:write"] },
    { name: "notification-service", scopes: ["notification:send"] },
    { name: "gateway", scopes: ["auth:read", "tender:read", "tender:write", "notification:read"] },
  ];
  for (const svc of services) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.serviceToken.upsert({
      where: { serviceName: svc.name },
      update: {},
      create: { serviceName: svc.name, token, scopes: svc.scopes },
    });
  }
  console.log(`Service tokens: ${services.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
