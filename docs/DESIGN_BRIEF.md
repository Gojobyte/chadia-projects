# Brief design — CHADIA Projects

Tu es product designer principal. Tu vas concevoir l'identité visuelle complète et l'interface d'une plateforme web SaaS appelée **CHADIA Projects**.

Ce brief te donne **uniquement le contexte produit, l'architecture et l'inventaire fonctionnel**. La direction artistique, les choix typographiques, la palette, le style graphique, la densité, les principes d'exécution — tout cela est **ta responsabilité**. Je ne veux pas t'enfermer dans un goût pré-mâché. Surprends-moi, défends tes choix, ose. Le seul critère est le suivant : quand je verrai le résultat, il faut que ça me donne envie d'en faire mon outil de travail quotidien et que ça donne au visiteur une impression de produit construit avec un soin maniaque.

## 1. Contexte produit

**CHADIA Projects** digitalise le cycle complet d'un appel d'offres pour des ONG opérant en Afrique francophone (siège : Tchad). De la rédaction du cahier des charges, à la publication, la collecte des soumissions, l'évaluation, l'attribution, jusqu'à la publication transparente des résultats au public.

L'enjeu : transformer une chaîne administrative pénible et opaque en un outil **rigoureux mais agréable**, qui donne confiance autant aux équipes internes qu'aux fournisseurs candidats et au grand public qui consulte les résultats.

Univers de référence métier (à étudier) :
- SAM.gov (système fédéral américain de marchés publics)
- TED Europa (Tenders Electronic Daily, UE)
- GeM (Government e-Marketplace, Inde)
- KONEPS (Korea Online E-Procurement System)

Ces plateformes sont fonctionnellement riches mais visuellement austères et datées. CHADIA doit faire mieux.

## 2. Utilisateurs

### Rôles internes (ONG)
- `DIRECTEUR` — décisions stratégiques, attribution finale des marchés, vue exécutive globale
- `ADMIN` — configuration de l'org, gestion équipe, modération fournisseurs
- `FINANCIER` — suivi budgets, attributions, reporting comptable
- `MEMBRE` — rédaction documents, évaluation technique des soumissions

### Acteurs externes
- **Fournisseurs** (entreprises, ONG, consultants) qui consultent les AO publiés et déposent des soumissions
- **Grand public** qui accède à la page transparence des résultats

### Volume cible
- 50 à 500 utilisateurs internes par organisation
- ~200 appels d'offres actifs simultanément
- ~5 000 fournisseurs en base
- Plateforme principalement utilisée sur desktop (poste de bureau), mais le mobile doit rester utilisable pour consulter notifications et statuts

## 3. Architecture frontend & inventaire des pages

L'application est un **Next.js 15 (App Router) + React 18 + TypeScript**. Les pages ci-dessous sont à concevoir.

### Pages publiques (accessibles sans connexion)

| Route | But fonctionnel |
|---|---|
| `/login` | Connexion email/password + Google OAuth (futur). Doit refléter l'identité de la plateforme dès la première impression. |
| `/resultats` | Registre public des marchés attribués. Filtrable par bailleur, secteur, année. Important : transparence légale, lisible et imprimable. |

### Pages authentifiées (avec navigation principale)

#### Tableau de bord
| Route | But fonctionnel |
|---|---|
| `/` | Dashboard exécutif. Vue synthétique : KPIs clés (nombre d'AO actifs, soumissions reçues, taux d'attribution, budget engagé), AO récents nécessitant une action, notifications, alertes deadlines critiques. Doit être immédiatement actionnable. |

#### Appels d'offres (cycle principal)
| Route | But fonctionnel |
|---|---|
| `/appels-offres` | Liste de tous les AO de l'organisation. Recherche, filtres (statut, catégorie, bailleur, secteur), tri. Vue par défaut + vue alternative (cards vs table). |
| `/appels-offres/nouveau` | Création d'un AO en plusieurs étapes (informations générales → cahier des charges → critères d'évaluation → calendrier → documents joints → équipe d'évaluation → publication). Sauvegarde automatique du brouillon. |
| `/appels-offres/[id]` | Fiche détaillée d'un AO : description, documents, soumissions reçues, évaluations, attribution, journal d'audit. Actions contextuelles (publier, clôturer, attribuer, exporter). |

#### Soumissions (réponses des fournisseurs)
| Route | But fonctionnel |
|---|---|
| `/soumissions` | Liste des soumissions à évaluer ou évaluées. Filtres par AO, par statut, par fournisseur. |
| `/soumissions/[id]` | Fiche soumission : pièces jointes, scoring multi-critères, commentaires des évaluateurs, décision finale. |

#### Fournisseurs
| Route | But fonctionnel |
|---|---|
| `/fournisseurs` | Annuaire des entreprises/ONG candidates. Recherche, filtres (catégorie juridique, statut de vérification, secteur d'expertise), tri. |
| `/fournisseurs/nouveau` | Inscription d'un nouveau fournisseur (raison sociale, immatriculation, secteurs, certifications, etc.). |
| `/fournisseurs/[id]` | Fiche fournisseur : profil complet, historique des soumissions, évaluations passées, statut de vérification. |

#### Projets (cycle plus large que les AO)
| Route | But fonctionnel |
|---|---|
| `/projets` | Liste des projets ONG (un projet peut contenir plusieurs AO). |
| `/projets/nouveau` | Création de projet (nom, bailleur, période, équipe, budget global). |
| `/projets/[id]` | Vue d'ensemble : équipe, budget, documents, AO rattachés, jalons. |
| `/projets/[id]/budget` | Ventilation budgétaire détaillée : prévu vs engagé vs restant, par poste. |
| `/projets/[id]/docs/[docId]` | Éditeur de document collaboratif (TDR, propositions, rapports). Sections, commentaires, versions, copilote IA pour suggestions. |

#### Bibliothèque
| Route | But fonctionnel |
|---|---|
| `/templates` | Bibliothèque de templates de documents réutilisables (TDR-types, modèles de contrats, grilles d'évaluation). |

#### Équipe & analytics
| Route | But fonctionnel |
|---|---|
| `/equipe` | Liste des membres de l'organisation : rôles, dernière activité, statut. Actions admin (inviter, changer rôle, désactiver). |
| `/analytics` | Tableaux de bord analytiques : volumes, délais moyens, taux d'attribution par catégorie, performance fournisseurs, budgets. |

#### Paramètres
| Route | But fonctionnel |
|---|---|
| `/parametres/profil` | Préférences personnelles (nom, avatar, mot de passe, langue future). |
| `/parametres/organisation` | Paramètres de l'organisation (logo, coordonnées, intégrations bailleurs). |
| `/parametres/notifications` | Abonnements aux notifications (par type, par canal email/in-app). |

## 4. Composants transverses à concevoir

Liste fonctionnelle. Les variantes, dimensions, micro-interactions sont à ta discrétion.

- **Système de navigation** principal (sidebar, topbar, breadcrumbs, recherche globale `Cmd+K`)
- **Boutons** dans toutes leurs variantes utiles (primaire, secondaire, danger, ghost, icône seule, avec loading)
- **Inputs** : texte, textarea, select, multi-select, checkbox, radio, switch, date picker, file upload, recherche
- **Tableaux de données** : tri, filtres, sélection multiple, actions de masse, pagination, vue vide, vue chargement
- **Cards** dans leurs variantes (statique, interactive, avec actions)
- **Badges de statut** : 8 états pour AO, 4 pour fournisseurs, 8 pour soumissions
- **Avatars** : avec initiales auto-générées et photo optionnelle, plusieurs tailles
- **Tabs**
- **Tooltips**
- **Modales / Dialogs** (pour confirmations, créations rapides)
- **Side sheets** (pour quick-views sans changer de page)
- **Notifications / Toasts**
- **Empty states** soignés pour chaque liste (avec CTA contextuel)
- **Skeletons / loading states**
- **Wizard / stepper** multi-étapes (création AO)
- **Sparklines / graphes simples** pour KPIs
- **Command palette** (`Cmd+K` global)
- **Système d'icônes** cohérent (suggère ce qui te paraît le mieux : Lucide, Phosphor, ou autre)
- **Typographie** : choisis la(les) police(s), l'échelle, les graisses
- **Système de couleurs** : choisis la palette complète (sémantique + neutres + accents)
- **Système d'espacement** : choisis ta grille
- **Système d'élévation** : choisis comment tu hiérarchises les surfaces

## 5. Stack & contraintes techniques

- **Framework** : Next.js 15 App Router (Server Components par défaut, "use client" justifié)
- **TypeScript** strict
- **CSS** : Tailwind CSS v4 + variables CSS custom — tu peux complètement redéfinir les variables existantes si ta direction l'exige
- **Composants** : préférence pour des composants custom légers ; Radix UI ou shadcn/ui acceptables comme base de primitives (Dialog, Popover, Tooltip, Toast). Pas de librairie UI lourde (pas de Material, Chakra, Mantine).
- **Icônes** : ton choix de set, mais un seul set sur toute l'app
- **Polices** : ton choix, à charger via `next/font`
- **Internationalisation** : MVP en français uniquement, mais structurer pour permettre arabe/anglais plus tard (pas de strings hardcodées dans des contextes multilingues critiques, prévoir RTL pour l'arabe à terme)
- **Accessibilité** : WCAG AA minimum, navigation clavier complète, focus visible partout, lecteurs d'écran corrects
- **Performance** : RSC autant que possible, pas de bundle JS gonflé inutilement
- **Responsive** : desktop prioritaire (1280-1920px), mais l'app doit rester utilisable jusqu'à 768px ; en dessous, navigation simplifiée acceptable

## 6. Inspirations à consulter (pas à copier)

Tu n'es pas obligé de t'inspirer de ces produits. Mais regarde-les pour comprendre **ce qui se fait de plus exigeant aujourd'hui** dans le SaaS B2B :

- **Linear** — densité, raccourcis clavier, command palette
- **Stripe Dashboard** — hiérarchie des chiffres, sobriété financière
- **Mercury** — typographie traitée comme objet éditorial
- **Vercel Dashboard** — cards, status, rigueur
- **Notion** — flexibilité de structure, éditeur
- **Pitch** — wizards, présentations
- **Height** — vues tables/board
- **Plain** — tableaux à respiration parfaite
- **Cron / Notion Calendar** — vues temporelles denses
- **Raycast** — command palette, esthétique
- **GOV.UK Design System** — pour la sobriété institutionnelle de la page `/resultats`

Univers à éviter explicitement : consumer flashy (gradients neon, illustrations 3D, glassmorphism, neumorphism, gamification colorée). Mais si tu trouves un angle original qui marche dans le contexte africain francophone et institutionnel, **vas-y** — argumente.

## 7. Tonalité de copie

Tout en français. Vouvoiement. Verbes à l'infinitif sur les boutons. Aucun emoji dans l'UI. Erreurs jamais culpabilisantes. Chiffres formatés en `Intl.NumberFormat('fr-FR')` avec espaces fines. Dates en format français long ("12 mai 2026") ou relatives selon le contexte.

## 8. Livrables attendus

### Étape 1 — Direction artistique
Trois propositions de directions distinctes, chacune décrite en :
- Philosophie en 2-3 phrases
- Palette complète (en hex ou oklch, avec rôles sémantiques)
- Choix typographique (familles, échelle, graisses)
- Iconographie (set, taille, traitement)
- Principes de mise en page (grille, densité, espacement)
- Tonalité visuelle (chaud/froid, neutre/coloré, dense/aéré)
- Ce qui la distingue des deux autres

Chaque direction doit être une vraie alternative — pas trois variantes de la même idée.

### Étape 2 — Validation
Je choisis une direction, on l'affine si besoin.

### Étape 3 — Composants
Système de design appliqué : tokens CSS, composants de base avec leurs variantes et états (boutons, inputs, badges, avatars, etc.). Code TSX + CSS prêts à l'emploi.

### Étape 4 — Pages prioritaires
Dans cet ordre :
1. `/login`
2. `/` (dashboard)
3. `/appels-offres` (liste)
4. `/appels-offres/[id]` (détail)
5. `/fournisseurs` (liste)
6. `/resultats` (page publique)

Pour chaque : code TSX complet (RSC quand possible), CSS additionnel, notes d'interaction (hovers, focus, loading, empty, errors), variantes responsives.

### Étape 5 — Suite
Les autres pages dans l'ordre que tu juges le plus logique.

## 9. Ce qui sera évalué

- Cohérence de la direction artistique sur toute l'app
- Qualité d'exécution des micro-détails (alignements, espacements, transitions, focus states, états vides)
- Hiérarchie de l'information (un utilisateur voit immédiatement ce qui est important)
- Lisibilité et accessibilité
- Performance ressentie (pas de jank, transitions fluides, loading states soignés)
- Capacité à se distinguer des outils administratifs ennuyeux sans tomber dans l'effet de mode
- Adéquation au contexte (institutionnel, africain, ONG, transparence publique)

Tu as carte blanche. Si une décision du brief te semble sous-optimale, dis-le et propose mieux. Le seul mauvais choix est l'absence de choix défendu.

---

**Commence par l'Étape 1 : trois directions artistiques distinctes.**
