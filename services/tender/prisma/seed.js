const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

// =====================================================================
// BAILLEURS
// =====================================================================
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
  { nom: "Solar Power Enterprise", sigle: "SPE", siteWeb: null },
  { nom: "Agence de Développement de l'Union Africaine", sigle: "AUDA-NEPAD", siteWeb: "https://www.nepad.org" },
  { nom: "Coopération Française", sigle: "CF", siteWeb: null },
];

// =====================================================================
// PROJETS — données réelles ONG CHADIA (ex-données hardcodées de la page)
// =====================================================================
const PROJETS = [
  {
    reference: "PRJ-2026-08",
    titre: "Réponse aux inondations dans le bassin du Batha",
    description: "Distribution de kits hygiène, abris d'urgence et réhabilitation de 6 forages affectés. Coordination avec la cellule OCHA Tchad et les autorités du Batha.",
    zone: "Mongo, Guéra",
    domaine: "URGENCE",
    statut: "ACTIF",
    urgent: true,
    bailleurs: ["UE", "PNUD"],
    team: ["AS", "MM", "FH"],
    echeance: "Échéance dans 18j",
    avancement: 62,
  },
  {
    reference: "PRJ-2025-14",
    titre: "Formation professionnelle de 240 jeunes vulnérables",
    description: "Cycle de 9 mois en couture, mécanique, maraîchage et boulangerie pour des jeunes déscolarisés des arrondissements 7, 8 et 9. Stage en entreprise et kit d'installation à la sortie.",
    zone: "N'Djaména",
    domaine: "JEUNESSE",
    statut: "ACTIF",
    bailleurs: ["PNUD", "CF"],
    team: ["MM", "RD", "AB"],
    echeance: "Clôture · 30 sept.",
    avancement: 78,
  },
  {
    reference: "PRJ-2025-09",
    titre: "Lutte contre les VBG en milieu rural",
    description: "Sensibilisation communautaire dans 14 villages, formation de 32 paralégaux et appui psycho-social aux survivantes. Partenariat avec les autorités traditionnelles et les ATPC de la province.",
    zone: "Guéra",
    domaine: "GENRE",
    statut: "ACTIF",
    bailleurs: ["UE"],
    team: ["FH"],
    echeance: "Clôture · 14 nov.",
    avancement: 54,
  },
  {
    reference: "PRJ-2024-11",
    titre: "Autonomisation économique de 180 femmes",
    description: "Formation à l'entreprenariat, mise en place de 12 groupements d'épargne villageois (AVEC) et accompagnement à la transformation des produits agricoles locaux (sésame, arachide, karité).",
    zone: "Mongo, Guéra",
    domaine: "FEMMES",
    statut: "ACTIF",
    bailleurs: ["PNUD"],
    team: ["FH", "AB"],
    echeance: "Clôture · 12 juil.",
    avancement: 82,
  },
  {
    reference: "PRJ-2025-04",
    titre: "Soutien scolaire aux enfants vulnérables",
    description: "Cours de remédiation, fournitures et bourses pour 420 élèves du primaire dans 6 quartiers défavorisés. Collaboration avec 4 écoles publiques partenaires.",
    zone: "N'Djaména",
    domaine: "EDUCATION",
    statut: "ACTIF",
    bailleurs: ["CF", "Fonds propres"],
    team: ["RD"],
    echeance: "Année scolaire",
    avancement: 71,
  },
  {
    reference: "PRJ-2025-12",
    titre: "Eau, hygiène et assainissement en zone rurale",
    description: "Réhabilitation de 8 forages communautaires, construction de 24 latrines familiales et formation de 14 comités de gestion. Volet sensibilisation à l'hygiène menstruelle dans 3 collèges.",
    zone: "Mongo, Guéra",
    domaine: "EAU",
    statut: "ACTIF",
    bailleurs: ["CF"],
    team: ["MM", "DH"],
    echeance: "Clôture · 28 fév. 2027",
    avancement: 38,
  },
  {
    reference: "PRJ-2026-02",
    titre: "Soins de santé primaires pour familles précaires",
    description: "Consultations gratuites, dépistage paludisme et nutrition dans 3 centres de santé urbains partenaires. 4 800 bénéficiaires attendus sur l'année.",
    zone: "N'Djaména",
    domaine: "SANTE",
    statut: "ACTIF",
    bailleurs: ["PNUD", "Fonds propres"],
    team: ["RD", "AS"],
    echeance: "Clôture · 31 déc.",
    avancement: 22,
  },
  {
    reference: "PRJ-2024-06",
    titre: "PRECOM — Renforcement communautaire",
    description: "Programme triennal de cohésion sociale autour de 3 communes du Guéra. Comités locaux de paix, dialogue intercommunautaire éleveurs-agriculteurs, médiation des conflits fonciers.",
    zone: "Guéra",
    domaine: "COHESION",
    statut: "ACTIF",
    bailleurs: ["UE"],
    team: ["FH"],
    echeance: "Clôture · 30 juin 2027",
    avancement: 66,
  },
  {
    reference: "PRJ-2023-03",
    titre: "Réinsertion de 96 jeunes déscolarisés",
    description: "Pilote sur 18 mois — formation, accompagnement individuel et amorçage. 78% des bénéficiaires en activité 6 mois après la sortie. Rapport final livré.",
    zone: "N'Djaména",
    domaine: "JEUNESSE",
    statut: "ACHEVE",
    bailleurs: ["PNUD"],
    team: ["MM"],
    echeance: "Achevé · 14 fév. 2025",
    avancement: 100,
    dateCloture: new Date("2025-02-14"),
  },
  {
    reference: "PRJ-2022-08",
    titre: "Microfinance solidaire pour 11 groupements",
    description: "Mise en place de caisses villageoises, formation à la gestion et suivi sur 24 mois. Taux de remboursement final : 91%. Étude d'impact externe livrée à la Coop. Française.",
    zone: "Mongo, Guéra",
    domaine: "FEMMES",
    statut: "ACHEVE",
    bailleurs: ["CF"],
    team: ["AB"],
    echeance: "Achevé · 30 sept. 2024",
    avancement: 100,
    dateCloture: new Date("2024-09-30"),
  },
  {
    reference: "PRJ-2026-12",
    titre: "Scolarisation des filles en milieu rural",
    description: "Note conceptuelle déposée le 22 mars 2026 auprès de la Coopération Française. Réponse attendue mi-juin. Projet pilote sur 3 villages cibles, 380 filles.",
    zone: "Guéra",
    domaine: "EDUCATION",
    statut: "MONTAGE",
    bailleurs: ["CF"],
    team: [],
    echeance: "Décision juin 2026",
    avancement: 25,
    etapeLabel: "Note conceptuelle déposée",
  },
  {
    reference: "PRJ-2026-15",
    titre: "Plaidoyer citoyenneté et participation des jeunes",
    description: "Concept en co-construction avec 4 OSC partenaires de N'Djaména. Recherche de bailleur en cours — pistes UE Délégation Tchad et fondations privées.",
    zone: "N'Djaména",
    domaine: "JEUNESSE",
    statut: "MONTAGE",
    bailleurs: [],
    team: [],
    echeance: "Bailleur à identifier",
    avancement: 10,
    etapeLabel: "Recherche bailleur",
  },
];

// =====================================================================
// SETTINGS — paramètres par défaut ONG CHADIA
// =====================================================================
const SETTINGS = [
  // Identité juridique
  { key: "org.denomination", value: "CHADIA — Chadia pour le Développement du Tchad", category: "ORGANIZATION", label: "Dénomination officielle" },
  { key: "org.sigle", value: "CDT", category: "ORGANIZATION", label: "Sigle court" },
  { key: "org.forme_juridique", value: "Association tchadienne sans but lucratif", category: "ORGANIZATION", label: "Forme juridique" },
  { key: "org.recipisse", value: "À renseigner", category: "ORGANIZATION", label: "Numéro de récépissé" },
  { key: "org.date_fondation", value: "À renseigner", category: "ORGANIZATION", label: "Date de fondation" },
  { key: "org.nif", value: "À renseigner", category: "ORGANIZATION", label: "Numéro d'identification fiscale" },
  { key: "org.mission", value: "Contribuer au développement économique et social du Tchad par la formation professionnelle, l'eau-assainissement, l'agriculture-élevage, l'éducation et la santé. Renforcer les capacités des MPME tchadiennes et accompagner les communautés des régions de N'Djamena, du Guéra et du Batha.", category: "ORGANIZATION", label: "Mission statutaire" },
  { key: "org.regime_fiscal", value: "Réel", category: "ORGANIZATION", label: "Régime fiscal" },

  // Branding
  { key: "branding.sigle_court", value: "CHADIA", category: "BRANDING", label: "Sigle affiché en sidebar" },
  { key: "branding.couleur_accent", value: "#B85C3A", category: "BRANDING", label: "Couleur d'accent (terre cuite)" },
  { key: "branding.mention_footer", value: "ONG CHADIA · BP 6118 N'Djamena · chadiaong@gmail.com", category: "BRANDING", label: "Mention bas de page PDF" },

  // Contact
  { key: "contact.email", value: "chadiaong@gmail.com", category: "CONTACT", label: "E-mail officiel" },
  { key: "contact.telephone_1", value: "+235 65 62 62 40", category: "CONTACT", label: "Téléphone principal" },
  { key: "contact.telephone_2", value: "+235 92 29 94 36", category: "CONTACT", label: "Téléphone secondaire" },
  { key: "contact.adresse", value: "Quartier Kabalaye, en face stade Idriss MHT OUYA, N'Djamena", category: "CONTACT", label: "Adresse postale" },
  { key: "contact.bp", value: "BP 6118 N'Djamena", category: "CONTACT", label: "Boîte postale" },

  // Workflow AO
  { key: "workflow.publication_auto", value: true, category: "WORKFLOW", label: "Publication automatique sur le registre public", description: "Les appels d'offres validés sont publiés dans l'heure sur /marches" },
  { key: "workflow.notification_fournisseurs", value: true, category: "WORKFLOW", label: "Notification automatique des fournisseurs ciblés", description: "Envoi par e-mail aux fournisseurs catégorisés par lot" },
  { key: "workflow.verrouillage_plis", value: true, category: "WORKFLOW", label: "Verrouillage des plis avant ouverture", description: "Soumissions chiffrées jusqu'à la séance d'ouverture officielle" },
  { key: "workflow.double_validation", value: true, category: "WORKFLOW", label: "Double validation avant attribution", description: "Signature électronique du DG et du Président du comité de dépouillement" },
  { key: "workflow.pv_auto", value: false, category: "WORKFLOW", label: "Génération automatique du PV de séance", description: "Bêta — à valider manuellement avant signature" },

  // Numérotation
  { key: "numerotation.format_ao", value: "AO-{ANNEE}-{NUM:3}", category: "NUMEROTATION", label: "Format référence Appel d'Offres" },
  { key: "numerotation.format_soumission", value: "SOUM-{NUM_AO}-{NUM:2}", category: "NUMEROTATION", label: "Format référence Soumission" },
  { key: "numerotation.format_projet", value: "PRJ-{ANNEE}-{NUM:2}", category: "NUMEROTATION", label: "Format référence Projet" },
  { key: "numerotation.annee_comptable", value: "01-01_31-12", category: "NUMEROTATION", label: "Année comptable" },

  // Intégrations
  { key: "integration.bsic", value: { active: true, nom: "BSIC Tchad", iban: "À renseigner", swift: "BSIYTDND" }, category: "INTEGRATION", label: "BSIC Tchad" },
  { key: "integration.gmail", value: { active: true, email: "chadiaong@gmail.com" }, category: "INTEGRATION", label: "Google Workspace" },
  { key: "integration.calcom", value: { active: false, slug: null }, category: "INTEGRATION", label: "Cal.com" },
  { key: "integration.hetzner_storage", value: { active: false, box_id: null }, category: "INTEGRATION", label: "Hetzner Storage Box" },
  { key: "integration.docusign", value: { active: false }, category: "INTEGRATION", label: "DocuSign" },
  { key: "integration.plausible", value: { active: false, domain: "ong-chadia.com" }, category: "INTEGRATION", label: "Plausible Analytics" },
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

  for (const s of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, label: s.label, description: s.description, category: s.category },
      create: s,
    });
  }
  console.log(`Settings seedés: ${SETTINGS.length}`);

  for (const p of PROJETS) {
    await prisma.projet.upsert({
      where: { reference: p.reference },
      update: p,
      create: p,
    });
  }
  console.log(`Projets seedés: ${PROJETS.length}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
