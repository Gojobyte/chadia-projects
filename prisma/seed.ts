import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  console.log("Debut du seed...\n");

  // 1. Compte Super Admin
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (email && password) {
    const passwordHash = await hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { role: "DIRECTEUR" },
      create: { email, name: "Directeur CHADIA", passwordHash, role: "DIRECTEUR" },
    });
    console.log(`Admin cree : ${email}`);
  }

  // 2. Bailleurs de reference
  const bailleurs = [
    { nom: "Programme des Nations Unies pour le Developpement", sigle: "PNUD", siteWeb: "https://www.undp.org" },
    { nom: "Union Europeenne", sigle: "UE", siteWeb: "https://ec.europa.eu" },
    { nom: "Banque Arabe pour le Developpement Economique en Afrique", sigle: "BADEA", siteWeb: "https://www.badea.org" },
    { nom: "Union Africaine", sigle: "UA", siteWeb: "https://au.int" },
    { nom: "Cooperation Francaise", sigle: "AFD", siteWeb: "https://www.afd.fr" },
    { nom: "Agence des Nations Unies pour les Refugies", sigle: "HCR", siteWeb: "https://www.unhcr.org" },
    { nom: "Fonds des Nations Unies pour l'Enfance", sigle: "UNICEF", siteWeb: "https://www.unicef.org" },
    { nom: "Organisation Mondiale de la Sante", sigle: "OMS", siteWeb: "https://www.who.int" },
    { nom: "Banque Mondiale", sigle: "BM", siteWeb: "https://www.worldbank.org" },
    { nom: "Fonds Europeen de Developpement", sigle: "FED", siteWeb: "https://ec.europa.eu" },
    { nom: "Autre bailleur", sigle: "AUTRE", siteWeb: null },
  ];

  for (const b of bailleurs) {
    await prisma.bailleur.upsert({
      where: { sigle: b.sigle },
      update: {},
      create: b,
    });
  }
  console.log(`${bailleurs.length} bailleurs crees`);

  // 3. Templates de documents
  const templates = [
    {
      categorie: "PROPOSITION_TECHNIQUE" as const,
      titre: "Proposition technique standard",
      description: "Structure type pour une proposition technique de 40-50 pages",
      contenu: `# Proposition Technique

## 1. Comprehension du contexte et des enjeux
[Decrire le contexte du pays/region, les defis identifies, et comment le projet y repond]

## 2. Objectif general et objectifs specifiques
### Objectif general
[Un objectif global]

### Objectifs specifiques
1. [OS1]
2. [OS2]
3. [OS3]

## 3. Resultats attendus
[Pour chaque objectif specifique, lister les resultats attendus]

## 4. Methodologie et approche
### 4.1 Approche globale
[Decrire l'approche methodologique]

### 4.2 Strategie d'intervention
[Details de la strategie]

### 4.3 Activites par resultat
[Lister les activites pour chaque resultat attendu]

## 5. Zones d'intervention
[Decrire les zones geographiques ciblees]

## 6. Beneficiaires
### Beneficiaires directs
[Nombre et profil]

### Beneficiaires indirects
[Nombre et profil]

## 7. Plan de suivi-evaluation
[Indicateurs, moyens de verification, frequence]

## 8. Perennisation et durabilite
[Comment les resultats seront maintenus apres le projet]

## 9. Gestion des risques
[Risques identifies et mesures d'attenuation]

## 10. Equipe du projet
[Organigramme et profils cles]`,
    },
    {
      categorie: "CADRE_LOGIQUE" as const,
      titre: "Cadre logique standard",
      description: "Matrice du cadre logique avec objectifs, resultats, indicateurs",
      contenu: `# Cadre Logique

| Logique d'intervention | Indicateurs | Sources de verification | Hypotheses |
|----------------------|-------------|----------------------|------------|
| **Objectif general** | | | |
| [OG] | [Indicateur] | [Source] | [Hypothese] |
| **Objectif specifique 1** | | | |
| [OS1] | [Indicateur] | [Source] | [Hypothese] |
| **Resultat 1.1** | | | |
| [R1.1] | [Indicateur] | [Source] | [Hypothese] |
| **Activite 1.1.1** | | | |
| [A1.1.1] | [Indicateur] | [Source] | [Hypothese] |`,
    },
    {
      categorie: "NOTE_CONCEPTUELLE" as const,
      titre: "Note conceptuelle standard",
      description: "Resume du projet en 5-10 pages",
      contenu: `# Note Conceptuelle

## 1. Titre du projet
[Titre]

## 2. Resume executif
[Resume en 1 paragraphe]

## 3. Contexte et justification
[Pourquoi ce projet est necessaire]

## 4. Objectifs
[Objectif general et objectifs specifiques]

## 5. Resultats attendus
[Liste des resultats]

## 6. Principales activites
[Activites cles]

## 7. Beneficiaires
[Qui beneficie du projet]

## 8. Budget estimatif
[Montant global et repartition]

## 9. Duree et calendrier
[Duree et phases principales]

## 10. Organisation responsable
[Presentation de l'ONG CHADIA]`,
    },
    {
      categorie: "BUDGET_PREVISIONNEL" as const,
      titre: "Budget previsionnel standard",
      description: "Structure budgetaire type par categories",
      contenu: `# Budget Previsionnel

| Ligne budgetaire | Unite | Quantite | Cout unitaire | Total |
|-----------------|-------|----------|---------------|-------|
| **1. Ressources Humaines** | | | | |
| Chef de projet | mois | 12 | | |
| Coordinateur terrain | mois | 12 | | |
| Comptable | mois | 12 | | |
| **2. Equipement** | | | | |
| Vehicule 4x4 | unite | 1 | | |
| Materiel informatique | lot | 1 | | |
| **3. Activites** | | | | |
| Formations | session | | | |
| Sensibilisation | campagne | | | |
| **4. Fonctionnement** | | | | |
| Loyer bureau | mois | 12 | | |
| Carburant | mois | 12 | | |
| Communication | mois | 12 | | |
| **5. Suivi-Evaluation** | | | | |
| Missions de suivi | mission | | | |
| Evaluation finale | forfait | 1 | | |
| **TOTAL GENERAL** | | | | |`,
    },
    {
      categorie: "PLAN_TRAVAIL" as const,
      titre: "Plan de travail standard",
      description: "Planning des activites par mois",
      contenu: `# Plan de Travail

| Activite | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | Responsable |
|---------|----|----|----|----|----|----|----|----|----|----|-----|-----|-------------|
| **Phase 1 : Demarrage** | | | | | | | | | | | | | |
| Recrutement equipe | X | | | | | | | | | | | | Admin |
| Installation bureau | X | X | | | | | | | | | | | Admin |
| **Phase 2 : Mise en oeuvre** | | | | | | | | | | | | | |
| Activite 1 | | X | X | X | | | | | | | | | |
| Activite 2 | | | X | X | X | X | | | | | | | |
| **Phase 3 : Cloture** | | | | | | | | | | | | | |
| Rapport final | | | | | | | | | | | X | X | Chef projet |
| Evaluation | | | | | | | | | | | | X | Evaluateur |`,
    },
  ];

  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { categorie: t.categorie, titre: t.titre },
    });
    if (!existing) {
      await prisma.template.create({ data: t });
    }
  }
  console.log(`${templates.length} templates crees`);

  console.log("\nSeed termine !");
}

main()
  .catch((e) => { console.error("Erreur seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
