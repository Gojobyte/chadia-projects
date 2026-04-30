# CHADIA Projects V2 — PRD

> Version 2.0 · Transformation : "Outil de stockage" → "Copilot des ONG"

---

## Vision

CHADIA Projects V2 devient un **systeme intelligent de reponse aux appels d'offres**.
L'application ne stocke plus, elle **pilote, genere, et valide**.

---

## 7 Chantiers Prioritaires

### Chantier 1 — IA (Game Changer) 🔥🔥🔥

**Objectif :** L'IA devient le co-pilote de chaque projet.

| Fonctionnalite | Description | Priorite |
|----------------|-------------|:--------:|
| **Analyse d'appel d'offre** | Upload le PDF/lien de l'appel → l'IA extrait : criteres, budget, deadline, exigences, documents requis | P0 |
| **Generation de contenu** | A partir de l'analyse, l'IA genere un brouillon de proposition technique, cadre logique, note conceptuelle | P0 |
| **Verification conformite** | L'IA verifie que le dossier repond a tous les criteres de l'appel d'offre (checklist auto) | P1 |
| **Assistance redaction** | Dans l'editeur : auto-complete, reformulation, suggestions contextuelles | P1 |
| **Scoring** | Note de qualite du dossier avant soumission (0-100%) | P2 |

**Stack IA :** Claude API (Anthropic) — le plus performant pour la redaction longue + l'analyse de documents.

### Chantier 2 — Workflow Metier 🔥🔥

**Objectif :** Remplacer les statuts simples par un vrai pipeline de production.

```
BROUILLON → REDACTION → RELECTURE → VALIDATION → FINALISATION → SOUMIS → ACCEPTE/REJETE
```

| Etape | Qui | Action |
|-------|-----|--------|
| Brouillon | Createur | Projet cree, structure definie |
| Redaction | Redacteurs | Ecriture des documents |
| Relecture | Relecteur | Review + commentaires |
| Validation | Directeur | Approuve ou demande des modifications |
| Finalisation | Admin | Mise en forme finale, verification conformite |
| Soumis | Directeur | Dossier envoye au bailleur |
| Accepte/Rejete | Bailleur | Resultat final |

**Regles :**
- Un document ne passe en "Relecture" que quand le redacteur le marque comme pret
- La validation necessite l'approbation du Directeur
- Notifications a chaque changement d'etape
- Historique complet des transitions

### Chantier 3 — Editeur Integre (remplacer Google Docs) 🔥🔥

**Objectif :** Reprendre le controle des documents pour permettre l'IA.

**Solution :** Block Editor style Notion (pas un clone Word)

| Bloc | Description |
|------|-------------|
| Texte | Paragraphes, titres H1-H4, listes |
| Tableau | Grilles editables (pour le cadre logique, budget) |
| Image | Upload + affichage |
| Callout | Encadres colores (info, attention, important) |
| Page break | Separation de pages |
| AI Block | Bloc genere par l'IA (prompt → contenu) |

**Avantages vs Google Docs :**
- Contenu stocke dans la BDD (pas dans un service externe)
- IA peut lire et modifier le contenu
- Versioning integre (snapshots)
- Export PDF/Word propre
- Pas besoin de compte Google

**Stack :** TipTap ou Plate.js (block editor)

### Chantier 4 — Timeline / Planning 🔥

**Objectif :** Voir le projet dans le temps, pas juste comme une liste.

**3 vues switchables :**
```
[Kanban] [Timeline] [Calendrier] [Tableau]
```

| Vue | Usage |
|-----|-------|
| **Kanban** | Suivi statut documents (existant) |
| **Timeline** | Gantt simplifie : qui fait quoi, quand, dependances |
| **Calendrier** | Deadlines, reunions, soumissions |
| **Tableau** | Vue detaillee avec filtres et tri |

### Chantier 5 — Collaboration Avancee 🔥

**Objectif :** Travailler en equipe reelle.

| Fonctionnalite | Description |
|----------------|-------------|
| **Commentaires** | Sur chaque document et chaque tache |
| **Mentions** | @nom dans les commentaires → notification |
| **Roles avances** | Admin, Manager, Redacteur, Relecteur, Finance, Viewer |
| **Permissions granulaires** | Qui peut editer quoi, qui peut valider |
| **Historique** | Qui a modifie quoi, quand (audit trail) |
| **Presence** | Voir qui est connecte (optionnel) |

### Chantier 6 — Module Budget 🔥

**Objectif :** Budget integre, pas Google Sheets.

| Fonctionnalite | Description |
|----------------|-------------|
| **Grille budgetaire** | Categories standard (RH, equipement, deplacement, fonctionnement) |
| **Calculs auto** | Totaux, sous-totaux, TVA |
| **Devises** | FCFA, EUR, USD avec conversion |
| **Templates budget** | Pre-remplis par type de projet |
| **IA budget** | Suggestion de budget base sur le type de projet |
| **Export Excel** | Format bailleur |

### Chantier 7 — Analytics 🔥

**Objectif :** Piloter la strategie de l'ONG.

| Indicateur | Description |
|------------|-------------|
| Taux de succes | Projets acceptes / soumis |
| Par bailleur | Performance par donateur |
| Temps de redaction | Duree moyenne de montage |
| Performance equipe | Contributions par membre |
| Pipeline | Montant total en cours |
| Historique | Evolution dans le temps |

---

## Roadmap par Sprints

### Sprint 1 (Semaine 1-2) — IA + Workflow
- Integrer Claude API pour l'analyse d'appels d'offres
- Pipeline de statuts avance (7 etapes)
- Notifications a chaque transition

### Sprint 2 (Semaine 3-4) — Editeur + Timeline
- Editeur block Notion-like (TipTap)
- Vue timeline/Gantt
- Vue calendrier

### Sprint 3 (Semaine 5-6) — Collaboration + Budget
- Commentaires sur documents
- Roles et permissions avances
- Module budget integre

### Sprint 4 (Semaine 7-8) — Analytics + Polish
- Dashboard analytics
- Export avances (PDF, Word, Excel)
- Optimisations UI/UX

---

## Stack Technique V2

| Brique | Techno |
|--------|--------|
| IA | Claude API (Anthropic) via AI SDK |
| Editeur | TipTap (block editor) |
| Timeline | @dnd-kit + CSS Grid custom |
| Budget | Tableur React (react-datasheet ou custom) |
| Charts | Recharts ou Chart.js |
| Export | jsPDF + docx (npm) |
| Temps reel | Polling 30s (existant) ou WebSocket |

---

> "L'objectif n'est pas de stocker des documents.
> C'est de gagner des appels d'offres."
