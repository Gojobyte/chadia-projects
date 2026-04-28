-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DIRECTEUR', 'ADMIN', 'FINANCIER', 'MEMBRE');

-- CreateEnum
CREATE TYPE "ProjetStatut" AS ENUM ('BROUILLON', 'EN_COURS', 'EN_REVISION', 'SOUMIS', 'ACCEPTE', 'REJETE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "ProjetRole" AS ENUM ('DIRECTEUR', 'ADMIN', 'FINANCIER', 'MEMBRE');

-- CreateEnum
CREATE TYPE "DocumentCategorie" AS ENUM ('PROPOSITION_TECHNIQUE', 'BUDGET_PREVISIONNEL', 'BUDGET_DETAIL', 'CADRE_LOGIQUE', 'NOTE_CONCEPTUELLE', 'PLAN_TRAVAIL', 'GANTT', 'CV', 'DOCUMENT_LEGAL', 'AUTRE');

-- CreateEnum
CREATE TYPE "DocumentStatut" AS ENUM ('A_FAIRE', 'EN_COURS', 'EN_REVISION', 'VALIDE');

-- CreateEnum
CREATE TYPE "TachePriorite" AS ENUM ('HAUTE', 'MOYENNE', 'BASSE');

-- CreateEnum
CREATE TYPE "TacheStatut" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBRE',
    "image" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "projets" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "objectifs" TEXT,
    "bailleurId" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "devise" TEXT NOT NULL DEFAULT 'FCFA',
    "datePublication" TIMESTAMP(3),
    "dateLimite" TIMESTAMP(3) NOT NULL,
    "statut" "ProjetStatut" NOT NULL DEFAULT 'BROUILLON',
    "appelOffreUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projet_membres" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjetRole" NOT NULL DEFAULT 'MEMBRE',

    CONSTRAINT "projet_membres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "categorie" "DocumentCategorie" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "contenu" TEXT,
    "fichierUrl" TEXT,
    "statut" "DocumentStatut" NOT NULL DEFAULT 'A_FAIRE',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "assigneAId" TEXT,
    "dateLimite" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taches" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "documentId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut" "TacheStatut" NOT NULL DEFAULT 'A_FAIRE',
    "priorite" "TachePriorite" NOT NULL DEFAULT 'MOYENNE',
    "dateLimite" TIMESTAMP(3),
    "assigneAId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bailleurs" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sigle" TEXT NOT NULL,
    "logoUrl" TEXT,
    "siteWeb" TEXT,

    CONSTRAINT "bailleurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "categorie" "DocumentCategorie" NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activites" (
    "id" TEXT NOT NULL,
    "projetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "projets_statut_idx" ON "projets"("statut");

-- CreateIndex
CREATE INDEX "projets_dateLimite_idx" ON "projets"("dateLimite");

-- CreateIndex
CREATE UNIQUE INDEX "projet_membres_projetId_userId_key" ON "projet_membres"("projetId", "userId");

-- CreateIndex
CREATE INDEX "documents_projetId_categorie_idx" ON "documents"("projetId", "categorie");

-- CreateIndex
CREATE INDEX "taches_projetId_idx" ON "taches"("projetId");

-- CreateIndex
CREATE INDEX "taches_assigneAId_idx" ON "taches"("assigneAId");

-- CreateIndex
CREATE UNIQUE INDEX "bailleurs_sigle_key" ON "bailleurs"("sigle");

-- CreateIndex
CREATE INDEX "activites_projetId_idx" ON "activites"("projetId");

-- CreateIndex
CREATE INDEX "activites_createdAt_idx" ON "activites"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_lu_idx" ON "notifications"("userId", "lu");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_bailleurId_fkey" FOREIGN KEY ("bailleurId") REFERENCES "bailleurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_membres" ADD CONSTRAINT "projet_membres_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_membres" ADD CONSTRAINT "projet_membres_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assigneAId_fkey" FOREIGN KEY ("assigneAId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_assigneAId_fkey" FOREIGN KEY ("assigneAId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activites" ADD CONSTRAINT "activites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
