# CHADIA Projects — PRD (Product Requirements Document)

> Powered by BMAD Method · Version 1.0 · Phase 1 (MVP)

---

## 1. Objectifs et Contexte

### 1.1 Objectifs

- Fournir a l'ONG CHADIA une **plateforme interne** pour gerer le montage de reponses aux appels d'offres des bailleurs internationaux (UE, PNUD, BADEA, etc.)
- **Organiser** tous les documents requis par projet/appel d'offres dans une structure claire
- **Suivre l'avancement** de chaque document et de chaque projet
- **Collaborer** entre membres de l'equipe avec des roles et permissions
- **Faciliter** la redaction grace a une IA integree (Phase 2)

### 1.2 Contexte

Aujourd'hui, l'ONG CHADIA gere ses reponses aux appels d'offres avec des documents eparpilles (email, WhatsApp, Google Drive). Il n'y a pas de vision centralisee de l'avancement, ni de structure standard pour les livrables. Quand un appel d'offres arrive, l'equipe improvise.

Cette plateforme resout ce probleme en offrant un **espace de travail structure** pour chaque appel d'offres, avec des templates, un suivi d'avancement, et une organisation par categorie de document.

### 1.3 Stack Technique

| Brique | Techno | Role |
|--------|--------|------|
| Framework | Next.js 16 (App Router) | App + API |
| ORM | Prisma 7 | Acces base de donnees |
| Base de donnees | PostgreSQL | Stockage (Railway) |
| Authentification | NextAuth.js v5 | Email/mdp + Google |
| Stockage fichiers | Cloudinary (images) + Google Drive (documents) | Fichiers |
| IA (Phase 2) | API Claude / OpenAI | Analyse et redaction |
| Hebergement | Railway | Production |

### 1.4 Journal des modifications

| Date | Version | Description |
|------|---------|-------------|
| 2026-04-28 | 1.0 | Creation initiale du PRD via session BMAD |

---

## 2. Utilisateurs et Roles

### 2.1 Matrice des Roles

| Role | Description | Acces |
|------|-------------|-------|
| **Directeur** | Supervise tous les projets, valide et soumet | Total + validation |
| **Admin** | Cree les projets, assigne les taches, gere les membres | Gestion projets + membres |
| **Financier** | Responsable du budget et des documents financiers | Budget + documents financiers |
| **Membre** | Redige les parties qui lui sont assignees | Ses taches uniquement |

### 2.2 Permissions

| Action | Directeur | Admin | Financier | Membre |
|--------|:---------:|:-----:|:---------:|:------:|
| Creer un projet | oui | oui | non | non |
| Voir tous les projets | oui | oui | oui | ses projets |
| Assigner des taches | oui | oui | non | non |
| Rediger un document | oui | oui | financiers | ses taches |
| Valider un document | oui | non | non | non |
| Soumettre un projet | oui | non | non | non |
| Gerer les membres | oui | oui | non | non |

---

## 3. Modeles de Donnees

### 3.1 Diagramme Entite-Relation

```
Projet (appel d'offres)
├── Informations generales (titre, bailleur, deadline, statut)
├── Documents[]
│   ├── Proposition technique (cahier des charges)
│   ├── Budget previsionnel
│   ├── Detail budgetaire
│   ├── Cadre logique
│   ├── Note conceptuelle
│   ├── Plan de travail
│   ├── Diagramme de Gantt
│   ├── CV equipe[]
│   └── Documents legaux[]
├── Taches[] (qui fait quoi)
├── Membres[] (equipe assignee)
└── Activites[] (journal des actions)
```

### 3.2 Tables principales

**Projet**
- id, titre, reference (numero appel d'offres)
- bailleur (PNUD, UE, etc.)
- datePublication, dateLimite
- statut : brouillon → en_cours → en_revision → soumis → accepte/rejete
- budget (montant demande)
- description, objectifs
- createdById

**Document**
- id, projetId
- categorie : proposition_technique | budget | budget_detail | cadre_logique | note_conceptuelle | plan_travail | gantt | cv | legal | autre
- titre, description
- contenu (texte riche — pour redaction en ligne)
- fichierUrl (lien Google Drive ou Cloudinary)
- statut : a_faire | en_cours | en_revision | valide
- assigneAId (qui redige)
- ordre

**Tache**
- id, projetId, documentId (optionnel)
- titre, description
- assigneAId
- statut : a_faire | en_cours | termine
- dateLimite
- priorite : haute | moyenne | basse

**Membre** (table de liaison Projet ↔ User)
- id, projetId, userId
- role : directeur | admin | financier | membre

**Activite** (journal)
- id, projetId
- userId
- action, description
- createdAt

**Bailleur** (table de reference)
- id, nom, sigle, logoUrl, siteWeb

**Template** (modeles reutilisables)
- id, categorie, titre, contenu
- description

---

## 4. Pages de l'Application

### 4.1 Pages principales

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Connexion |
| Dashboard | `/` | Vue d'ensemble : projets en cours, deadlines, taches |
| Projets | `/projets` | Liste de tous les projets avec filtres |
| Nouveau projet | `/projets/nouveau` | Formulaire creation avec detection des docs requis |
| Detail projet | `/projets/[id]` | Vue kanban des documents + taches + equipe |
| Document | `/projets/[id]/docs/[docId]` | Editeur de document (texte riche) |
| Budget | `/projets/[id]/budget` | Editeur de budget (tableau) |
| Gantt | `/projets/[id]/gantt` | Diagramme de Gantt interactif |
| Equipe | `/projets/[id]/equipe` | Membres assignes + roles |
| Templates | `/templates` | Bibliotheque de modeles reutilisables |
| Membres | `/membres` | Gestion des utilisateurs (Admin) |

### 4.2 Dashboard — Widgets

- **Projets en cours** : liste avec barres de progression
- **Deadlines proches** : projets dont la date limite approche (< 7 jours)
- **Mes taches** : taches assignees a l'utilisateur connecte
- **Activite recente** : dernieres actions sur les projets

### 4.3 Detail Projet — Vue Kanban

La page projet affiche les documents sous forme de **colonnes kanban** :

```
| A faire      | En cours     | En revision  | Valide       |
|--------------|--------------|--------------|--------------|
| Budget det.  | Proposition  | Cadre log.   | Docs legaux  |
| Plan travail | Budget prev. |              | CV equipe    |
| Gantt        |              |              |              |
```

Chaque carte montre : titre, assigne, deadline, progression.

---

## 5. Liste des Epics — Phase 1 (MVP)

| Epic | Nom | Stories | Description |
|------|-----|:-------:|-------------|
| 1 | Infrastructure | 4 | Setup projet, BDD, auth, structure |
| 2 | Gestion des projets | 5 | CRUD projets, dashboard, liste |
| 3 | Gestion des documents | 5 | Categories, statuts, editeur, upload |
| 4 | Collaboration | 3 | Taches, assignation, activite |
| 5 | Templates & Export | 3 | Modeles reutilisables, export PDF/Word |

**Total : 20 stories**

---

## 6. Epic 1 — Infrastructure

### Story 1.1 — Setup projet Next.js
- Projet Next.js 16 + TypeScript strict + Tailwind
- Prisma 7 + PostgreSQL Railway
- Structure de dossiers

### Story 1.2 — Schema Prisma + Migration
- Tous les modeles (Projet, Document, Tache, Membre, Activite, Bailleur, Template)
- Migration initiale

### Story 1.3 — Authentification
- NextAuth v5 avec email/mdp
- Roles (Directeur, Admin, Financier, Membre)
- Middleware protection des routes

### Story 1.4 — Seed des donnees initiales
- Bailleurs de reference (PNUD, UE, BADEA, etc.)
- Templates de documents par defaut
- Compte admin initial

---

## 7. Epic 2 — Gestion des Projets

### Story 2.1 — Dashboard
- Projets en cours avec progression
- Deadlines proches
- Taches assignees

### Story 2.2 — Liste des projets
- Tableau avec filtres (statut, bailleur, date)
- Barre de progression par projet
- Actions rapides (archiver, dupliquer)

### Story 2.3 — Creation de projet
- Formulaire : titre, bailleur, reference, deadline, budget, description
- Selection des categories de documents a produire (checklist)
- Creation automatique des documents vides

### Story 2.4 — Detail projet (vue kanban)
- Colonnes par statut de document
- Drag & drop pour changer le statut
- Barre de progression globale

### Story 2.5 — Gestion de l'equipe projet
- Ajouter/retirer des membres
- Assigner des roles par projet

---

## 8. Epic 3 — Gestion des Documents

### Story 3.1 — Liste des documents par projet
- Tableau avec categorie, statut, assigne, deadline
- Filtres par categorie et statut

### Story 3.2 — Editeur de document (texte riche)
- Editeur WYSIWYG pour rediger directement dans la plateforme
- Sauvegarde automatique
- Historique des versions

### Story 3.3 — Editeur de budget (tableau)
- Grille editable pour le budget previsionnel
- Calculs automatiques (totaux, sous-totaux)
- Categories budgetaires standard (personnel, equipement, deplacement, etc.)

### Story 3.4 — Upload de fichiers
- Upload PDF, Word, Excel depuis l'ordinateur
- Lien vers Google Drive
- Preview des fichiers

### Story 3.5 — Validation de documents
- Le Directeur peut valider un document
- Historique de validation (qui, quand)
- Notification quand un document est pret pour validation

---

## 9. Epic 4 — Collaboration

### Story 4.1 — Gestion des taches
- Creer une tache liee a un document ou independante
- Assigner a un membre, deadline, priorite
- Checklist dans les taches

### Story 4.2 — Journal d'activite
- Chaque action est enregistree (creation, modification, validation)
- Timeline visible sur la page projet
- Filtres par utilisateur et type d'action

### Story 4.3 — Notifications (basique)
- Notification dans l'app quand on est assigne a une tache
- Notification quand un document est valide/rejete
- Badge de notification dans le header

---

## 10. Epic 5 — Templates & Export

### Story 5.1 — Bibliotheque de templates
- Templates par categorie de document
- Dupliquer un template dans un projet
- Creer un template depuis un document existant

### Story 5.2 — Export PDF
- Exporter un document en PDF propre
- Exporter tout le dossier projet en ZIP

### Story 5.3 — Templates de budget
- Grille de budget pre-remplie par type de projet
- Categories standard (personnel, equipement, etc.)

---

## 11. Exigences Non-Fonctionnelles

- **Securite** : Chaque utilisateur ne voit que ses projets/taches
- **Performance** : Sauvegarde automatique toutes les 30s dans l'editeur
- **Mobile** : Interface responsive (mais optimisee desktop)
- **Donnees** : Backup automatique Railway

---

> **Prochaine etape** : Coder l'Epic 1 — Infrastructure
