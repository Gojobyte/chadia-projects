const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

const BAILLEURS = [
  { nom: "Banque mondiale", sigle: "BM", siteWeb: "https://www.banquemondiale.org" },
  { nom: "Programme des Nations Unies pour le Développement", sigle: "PNUD", siteWeb: "https://www.undp.org" },
  { nom: "Fonds des Nations Unies pour l'Enfance", sigle: "UNICEF", siteWeb: "https://www.unicef.org" },
  { nom: "Banque Africaine de Développement", sigle: "BAD", siteWeb: "https://www.afdb.org" },
  { nom: "Union Européenne", sigle: "UE", siteWeb: "https://european-union.europa.eu" },
  { nom: "Agence Française de Développement", sigle: "AFD", siteWeb: "https://www.afd.fr" },
  { nom: "Agence des États-Unis pour le Développement International", sigle: "USAID", siteWeb: "https://www.usaid.gov" },
  { nom: "Coopération Allemande pour le Développement", sigle: "GIZ", siteWeb: "https://www.giz.de" },
  { nom: "Organisation des Nations Unies pour l'Alimentation et l'Agriculture", sigle: "FAO", siteWeb: "https://www.fao.org" },
  { nom: "Programme Alimentaire Mondial", sigle: "PAM", siteWeb: "https://fr.wfp.org" },
];

async function main() {
  for (const b of BAILLEURS) {
    await prisma.bailleur.upsert({
      where: { sigle: b.sigle },
      update: { nom: b.nom, siteWeb: b.siteWeb },
      create: b,
    });
  }
  console.log(`Bailleurs seedés: ${BAILLEURS.length}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
