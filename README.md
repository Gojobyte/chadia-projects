# CHADIA — Architecture Microservices

Plateforme de gestion de marchés publics — inspirée des meilleurs systèmes mondiaux (SAM.gov, TED, GeM, KONEPS).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Next.js)                  │
│                      Port 3000 — Frontend + Proxy           │
├──────────────┬──────────────────┬───────────────────────────┤
│  Auth Svc    │   Tender Svc     │   Notification Svc        │
│  Port 3001   │   Port 3002      │   Port 3003               │
│  ──────────  │   ────────────   │   ──────────────────      │
│  JWT/Session │   AO/Soumissions │   In-app + Email (Resend) │
│  Users/Roles │   Fournisseurs   │   Alertes/Abonnements     │
│  Audit Log   │   Documents      │   Worker (outbox)         │
│  S2S Tokens  │   Evaluations    │                           │
│              │   Analytics      │                           │
├──────────────┴──────────────────┴───────────────────────────┤
│                      PostgreSQL (schémas isolés)             │
│                      Port 5432                              │
├─────────────────────────────────────────────────────────────┤
│                      Redis (cache + sessions)                │
│                      Port 6379                              │
└─────────────────────────────────────────────────────────────┘
```

## Démarrage rapide

```bash
# 1. Cloner et configurer
cp .env.example .env

# 2. Lancer l'infrastructure
docker-compose up -d postgres redis

# 3. Initialiser les bases de données
cd services/auth && npm install && npx prisma db push && node prisma/seed.js
cd ../tender && npm install && npx prisma db push
cd ../notification && npm install && npx prisma db push

# 4. Lancer les services (un terminal par service)
cd services/auth && npm run dev
cd services/tender && npm run dev
cd services/notification && npm run dev
cd services/notification && npm run worker

# 5. Lancer le gateway
cd services/gateway && npm run dev
```

## Schémas de base de données

| Service | Schéma Prisma | Tables |
|---------|--------------|--------|
| Auth | `auth` | users, sessions, refresh_tokens, audit_logs, service_tokens |
| Tender | `tender` | fournisseurs, bailleurs, appels_offres, soumissions, documents, evaluations, resultats, outbox_events |
| Notification | `notification` | notifications, alertes, abonnements, email_logs |

## Communication inter-services

1. **HTTP REST** — Le gateway proxifie les requêtes vers les services
2. **Pattern Outbox** — Le tender service publie des events dans `tender.outbox_events`
3. **Worker** — Le notification service poll l'outbox toutes les 10s et déclenche les notifications
4. **Service Tokens** — Tokens JWT pour authentifier les services entre eux

## API Endpoints

### Auth Service (3001)
- `POST /auth/register` — Inscription
- `POST /auth/login` — Connexion
- `GET /auth/me` — Profil
- `GET /auth/users` — Liste (admin)
- `GET /auth/validate` — Validation token (interne)

### Tender Service (3002)
- `GET/POST /fournisseurs` — CRUD fournisseurs
- `PATCH /fournisseurs/:id/verify` — Vérification
- `GET/POST /appels-offres` — CRUD appels d'offres
- `PATCH /appels-offres/:id/publish` — Publication
- `GET/POST /soumissions` — Dépôt/consultation soumissions
- `PUT /soumissions/:id/evaluate` — Évaluation
- `PATCH /soumissions/:id/retain` — Attribution marché
- `GET/POST /documents` — Gestion documents
- `GET /analytics` — Statistiques

### Notification Service (3003)
- `GET/POST /notifications` — Notifications
- `POST /notifications/bulk` — Notification en masse
- `GET/POST /alertes` — Alertes
- `GET/POST /abonnements` — Abonnements
- `POST /email/send` — Envoi email
