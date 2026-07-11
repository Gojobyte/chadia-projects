const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("./generated/prisma");
const { runConnector, runAllConnectors, CONNECTORS } = require("./connectors");
const { startCron } = require("./cron");
const { sanitizeRichHtml, stripAllHtml } = require("./sanitize");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3002;

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || "10485760", 10); // 10 MB par défaut

// S'assurer que le dossier d'upload existe
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// MIME types autorisés (sécurité de base)
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "text/plain", "text/csv", "text/markdown",
  "application/zip", "application/x-zip-compressed",
  "application/json",
]);

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Sous-dossier par entité (projet, candidature, opportunité) si fourni
    const sub = req.body?.projetId || req.body?.candidatureId || req.body?.opportuniteId || "lib";
    const dir = path.join(UPLOAD_DIR, sub.replace(/[^a-zA-Z0-9_-]/g, ""));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = crypto.randomBytes(16).toString("hex");
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`MIME type non autorisé : ${file.mimetype}`));
  },
});

app.use(cors());
// Limit explicite : pieceContents peut faire 200KB par pièce, qaThread peut
// avoir jusqu'à 200 entrées. 2MB de marge couvre largement les usages
// légitimes et bloque les payloads abusifs (DoS via parse JSON géant).
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", service: "tender" }));

// ============================================================
// MIDDLEWARE: Auth via auth-service
// ============================================================
async function auth(req, res, next) {
  const authUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const resp = await fetch(`${authUrl}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (!data.valid) return res.status(401).json({ error: "Invalid token" });
    req.user = data.user;
    next();
  } catch {
    return res.status(503).json({ error: "Auth service unavailable" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// Helper: publish outbox event
async function publishEvent(eventType, payload) {
  await prisma.outboxEvent.create({ data: { eventType, payload } });
}

// ============================================================
// BAILLEURS
// ============================================================

// GET /bailleurs — liste (publique pour permettre le rendu de la page nouveau AO)
app.get("/bailleurs", async (req, res) => {
  try {
    const bailleurs = await prisma.bailleur.findMany({
      select: { id: true, nom: true, sigle: true, logoUrl: true, siteWeb: true },
      orderBy: { sigle: "asc" },
    });
    res.json({ bailleurs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /bailleurs — création (admin/directeur)
app.post("/bailleurs", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const { nom, sigle, logoUrl, siteWeb } = req.body;
    if (!nom || !sigle) return res.status(400).json({ error: "nom and sigle required" });
    const existing = await prisma.bailleur.findUnique({ where: { sigle } });
    if (existing) return res.status(409).json({ error: "Sigle already exists" });
    const bailleur = await prisma.bailleur.create({ data: { nom, sigle, logoUrl, siteWeb } });
    res.status(201).json({ bailleur });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// OPPORTUNITÉS — appels à propositions des bailleurs
// ============================================================

// GET /opportunites — liste filtrable
// Filtres appliqués par défaut (politique CHADIA) :
//   - statut ≠ EXPIREE et ≠ IGNOREE
//   - publié en 2026 (datePublication >= 2026-01-01)
//   - a une date limite renseignée (dateLimiteDepot IS NOT NULL)
//
// Override : ?showAll=true ignore TOUS ces filtres par défaut.
// Override partiel : ?includeExpired=true, ?includeIgnored=true.
// Filtre explicite : ?statut=EXPIREE force ce statut quel que soit le défaut.
app.get("/opportunites", auth, async (req, res) => {
  try {
    const { q, statut, source, bailleurId, secteur, typeFinancement, includeExpired, includeIgnored, showAll, page = "1", limit = "30" } = req.query;
    const where = {};
    const noDefaults = showAll === "true";

    if (statut) {
      where.statut = statut;
    } else if (!noDefaults) {
      const exclude = [];
      if (includeExpired !== "true") exclude.push("EXPIREE");
      if (includeIgnored !== "true") exclude.push("IGNOREE");
      if (exclude.length) where.statut = { notIn: exclude };
    }

    if (!noDefaults) {
      // Publié en 2026
      where.datePublication = { gte: new Date("2026-01-01T00:00:00Z") };
      // Date limite renseignée (champ non null)
      where.dateLimiteDepot = { not: null };
    }

    if (source) where.sourceConnector = source;
    if (bailleurId) where.bailleurId = bailleurId;
    if (secteur) where.secteur = { contains: secteur, mode: "insensitive" };
    if (typeFinancement) where.typeFinancement = typeFinancement;
    if (q) where.OR = [
      { titre: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { bailleurNom: { contains: q, mode: "insensitive" } },
    ];

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [opportunites, total] = await Promise.all([
      prisma.opportunite.findMany({
        where,
        include: {
          bailleur: { select: { nom: true, sigle: true, logoUrl: true } },
          candidature: { select: { id: true, reference: true, statut: true } },
        },
        orderBy: [{ dateLimiteDepot: "asc" }, { collecteAt: "desc" }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.opportunite.count({ where }),
    ]);
    res.json({ opportunites, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /opportunites/:id — détail
app.get("/opportunites/:id", auth, async (req, res) => {
  try {
    const o = await prisma.opportunite.findUnique({
      where: { id: req.params.id },
      include: {
        bailleur: true,
        candidature: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!o) return res.status(404).json({ error: "Not found" });
    res.json({ opportunite: o });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /opportunites — saisie manuelle (et plus tard : ingestion par les connecteurs)
app.post("/opportunites", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const b = req.body;
    if (!b.titre) return res.status(400).json({ error: "titre required" });
    const data = {
      ...b,
      sourceConnector: b.sourceConnector || "MANUEL",
      dateLimiteDepot: b.dateLimiteDepot ? new Date(b.dateLimiteDepot) : null,
      datePublication: b.datePublication ? new Date(b.datePublication) : null,
    };
    const opp = await prisma.opportunite.create({ data });
    await publishEvent("opportunity.created", { id: opp.id, titre: opp.titre, sourceConnector: opp.sourceConnector });
    res.status(201).json({ opportunite: opp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /opportunites/sync/:source — déclenche un connecteur de veille
// :source = TED | ALL
// Le run est synchrone (max ~30s). En cas de batch plus long on basculerait
// sur du job en arrière-plan, mais pour 250 notices/jour ça reste OK.
app.post("/opportunites/sync/:source", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const source = String(req.params.source || "").toUpperCase();
    if (source === "ALL") {
      const reports = await runAllConnectors(prisma);
      const totals = reports.reduce(
        (acc, r) => {
          acc.fetched += r.counts.fetched;
          acc.created += r.counts.created;
          acc.updated += r.counts.updated;
          return acc;
        }, { fetched: 0, created: 0, updated: 0 }
      );
      return res.json({ ok: true, reports, totals });
    }
    if (!CONNECTORS[source]) return res.status(400).json({ error: `Connecteur ${source} inconnu` });
    const report = await runConnector(prisma, source);
    res.json(report);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /opportunites/:id/analyze — analyse IA Mistral
// Lit le texte de l'opportunité, appelle Mistral pour en extraire la liste
// des pièces requises, critères, axes stratégiques. Le résultat est mis en
// cache dans rawPayload._chadia.analysis pour éviter les appels répétés.
// Pour forcer une nouvelle analyse, passer { force: true } dans le body.
app.post("/opportunites/:id/analyze", auth, requireRole("ADMIN", "DIRECTEUR", "FINANCIER"), async (req, res) => {
  try {
    const mistral = require("./ai/mistral");
    if (!mistral.isEnabled()) {
      return res.status(503).json({
        error: "Mistral désactivé",
        detail: "MISTRAL_API_KEY non configurée dans l'environnement du tender-service",
      });
    }

    const opp = await prisma.opportunite.findUnique({ where: { id: req.params.id } });
    if (!opp) return res.status(404).json({ error: "Opportunité introuvable" });

    const existingRaw = opp.rawPayload || {};
    const cached = existingRaw?._chadia?.analysis;
    const force = req.body?.force === true || req.query?.force === "true";
    if (cached && !force) {
      return res.json({ ok: true, fromCache: true, analysis: cached });
    }

    const analysis = await mistral.analyzeOpportunite(opp);
    const updated = await prisma.opportunite.update({
      where: { id: opp.id },
      data: {
        rawPayload: {
          ...existingRaw,
          _chadia: {
            ...(existingRaw._chadia || {}),
            analysis,
          },
        },
      },
      select: { id: true, rawPayload: true },
    });
    res.json({
      ok: true,
      fromCache: false,
      analysis: updated.rawPayload?._chadia?.analysis ?? analysis,
    });
  } catch (e) {
    console.error("[analyze] échec :", e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /opportunites/:id — décision (A_ETUDIER / IGNOREE) + mise à jour de champs libres
app.patch("/opportunites/:id", auth, async (req, res) => {
  try {
    const { statut, ...rest } = req.body;
    const data = { ...rest };
    if (statut) {
      data.statut = statut;
      data.decideePar = req.user.id;
      data.decideeAt = new Date();
    }
    const opp = await prisma.opportunite.update({ where: { id: req.params.id }, data });
    res.json({ opportunite: opp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CANDIDATURES — dossiers que CHADIA monte
// ============================================================

function nextCandidatureRef() {
  const year = new Date().getFullYear();
  const seed = Math.floor(Math.random() * 9000 + 1000); // CAND-2026-1234 (collision improbable, on retentera côté create)
  return `CAND-${year}-${seed}`;
}

// GET /candidatures — liste filtrable
app.get("/candidatures", auth, async (req, res) => {
  try {
    const { q, statut, coordinateurId, page = "1", limit = "30" } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (coordinateurId) where.coordinateurId = coordinateurId;
    if (q) where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { titre: { contains: q, mode: "insensitive" } },
    ];

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [candidatures, total] = await Promise.all([
      prisma.candidature.findMany({
        where,
        include: {
          opportunite: {
            select: {
              id: true, titre: true, dateLimiteDepot: true, sourceConnector: true,
              bailleur: { select: { nom: true, sigle: true } },
            },
          },
          _count: { select: { documents: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.candidature.count({ where }),
    ]);
    res.json({ candidatures, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /candidatures/:id — détail
// P0 sécurité : pour MEMBRE, on n'autorise que les candidatures où il est
// dans l'équipe ou coordinateur. ADMIN/DIRECTEUR/FINANCIER voient tout.
// Les documents CONFIDENTIEL sont filtrés pour les rôles non admin.
app.get("/candidatures/:id", auth, async (req, res) => {
  try {
    const c = await prisma.candidature.findUnique({
      where: { id: req.params.id },
      include: {
        opportunite: { include: { bailleur: true } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!c) return res.status(404).json({ error: "Not found" });

    const role = req.user.role;
    const userId = req.user.id;
    const isPrivileged = role === "ADMIN" || role === "DIRECTEUR" || role === "FINANCIER";

    // Scope MEMBRE : doit être coordinateur OU dans equipe.
    if (!isPrivileged) {
      const inTeam = Array.isArray(c.equipe) && c.equipe.includes(userId);
      const isCoordinator = c.coordinateurId === userId;
      if (!inTeam && !isCoordinator) {
        return res.status(403).json({ error: "Accès refusé à cette candidature" });
      }
    }

    // Filtre documents : MEMBRE et FINANCIER ne voient pas les CONFIDENTIEL
    // (alignement avec GET /documents).
    if (role !== "ADMIN" && role !== "DIRECTEUR") {
      c.documents = c.documents.filter((d) => d.visibility !== "CONFIDENTIEL");
    }

    res.json({ candidature: c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /candidatures/:id/draft/:section — rédige un brouillon via Mistral
// Sections valides : contexte | pertinence | methodologie | genre | calendrier
// Le brouillon n'est PAS persisté automatiquement — le client décide s'il
// veut le coller dans le textarea et soumettre.
app.post("/candidatures/:id/draft/:section", auth, requireRole("ADMIN", "DIRECTEUR", "FINANCIER"), async (req, res) => {
  try {
    const mistral = require("./ai/mistral");
    if (!mistral.isEnabled()) {
      return res.status(503).json({
        error: "Mistral désactivé",
        detail: "MISTRAL_API_KEY non configurée",
      });
    }

    const cand = await prisma.candidature.findUnique({
      where: { id: req.params.id },
      include: {
        opportunite: { include: { bailleur: true } },
      },
    });
    if (!cand) return res.status(404).json({ error: "Candidature introuvable" });

    const section = String(req.params.section || "").toLowerCase();
    const valid = ["contexte", "pertinence", "methodologie", "genre", "calendrier"];
    if (!valid.includes(section)) {
      return res.status(400).json({
        error: `Section inconnue. Valides : ${valid.join(", ")}`,
      });
    }

    // Enrichissement du contexte IA : on récupère les documents de la
    // bibliothèque (limités à un sous-ensemble pertinent pour la section) pour
    // que Mistral s'inspire des références CHADIA existantes plutôt que
    // d'inventer ex nihilo. Limité aux 20 plus récents pour ne pas exploser
    // la taille du prompt.
    const sectionKeywords = {
      contexte: ["rapport", "activité", "présentation", "fiche"],
      pertinence: ["bailleur", "convention", "attestation", "réalisation"],
      methodologie: ["manuel", "procédure", "pmp", "wash", "agriculture", "santé"],
      genre: ["peas", "vbg", "code", "conduite", "sauvegarde"],
      calendrier: ["pmp", "rapport", "calendrier", "planning"],
    };
    const keywords = sectionKeywords[section] ?? [];
    const libraryDocs = await prisma.document.findMany({
      where: {
        OR: [
          ...(keywords.length > 0 ? keywords.map((kw) => ({ nom: { contains: kw, mode: "insensitive" } })) : []),
          ...(keywords.length > 0 ? keywords.map((kw) => ({ description: { contains: kw, mode: "insensitive" } })) : []),
          { tags: { hasSome: keywords } },
        ],
        visibility: { in: ["INTERNE", "PUBLIC"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, nom: true, description: true, tags: true, type: true, category: true },
    });

    const draft = await mistral.draftNarrativeSection({
      section,
      opp: cand.opportunite,
      cand,
      libraryDocs, // ← nouveau : références CHADIA pertinentes
    });

    res.json({
      ok: true,
      section: draft.section,
      titre: draft.titre,
      text: draft.text,
      usage: draft.usage,
      _meta: draft._meta,
    });
  } catch (e) {
    console.error("[draft] échec :", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /candidatures/:id/export.zip — bundle ZIP de la candidature
// Pack toutes les pièces jointes + un manifest.txt (référence, titre,
// bailleur, échéances, liste des pièces avec leur catégorie). C'est ce
// ZIP que CHADIA ré-uploadera sur le portail du bailleur (Quantum UNDP,
// EuropeAid…). Streaming via `archiver` pour éviter de charger toute
// la candidature en mémoire.
app.get("/candidatures/:id/export.zip", auth, async (req, res) => {
  let archive;
  try {
    const c = await prisma.candidature.findUnique({
      where: { id: req.params.id },
      include: {
        opportunite: { include: { bailleur: true } },
        documents: { orderBy: { category: "asc" } },
      },
    });
    if (!c) return res.status(404).json({ error: "Candidature introuvable" });

    // Contrôle d'accès : seules ces personnes peuvent exporter
    if (!["ADMIN", "DIRECTEUR", "FINANCIER"].includes(req.user.role)) {
      return res.status(403).json({ error: "Accès en export refusé" });
    }

    // P0 sécu : filtre les documents CONFIDENTIEL pour les non-admin
    // (FINANCIER ne doit pas pouvoir exfiltrer ces pièces via le ZIP).
    if (req.user.role !== "ADMIN" && req.user.role !== "DIRECTEUR") {
      c.documents = c.documents.filter((d) => d.visibility !== "CONFIDENTIEL");
    }

    // Filtre optionnel : query ?docs=id1,id2,id3 → on n'exporte QUE ces docs
    // (export sélectif, audit P2-36). Si absent, on exporte tout.
    // Borne la liste à 200 IDs pour éviter un DoS via query géante.
    const selectedIds = String(req.query.docs || "").split(",").filter(Boolean).slice(0, 200);
    if (selectedIds.length > 0) {
      c.documents = c.documents.filter((d) => selectedIds.includes(d.id));
    }

    const archiver = require("archiver");
    archive = archiver("zip", { zlib: { level: 9 } });

    // Si l'archive plante en cours de stream, on log mais on ne peut plus
    // changer les headers — Express a déjà commencé à écrire.
    archive.on("warning", (err) => console.warn("[zip] warning :", err.message));
    archive.on("error", (err) => {
      console.error("[zip] erreur fatale :", err.message);
      try { res.end(); } catch { /* ignore */ }
    });

    // Nom de fichier user-friendly : CAND-2026-001-bundle.zip
    const safeRef = (c.reference || "candidature").replace(/[^A-Za-z0-9_-]/g, "");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeRef}-bundle.zip"`);
    archive.pipe(res);

    // ---- Manifest texte au format lisible ----
    const lines = [];
    lines.push(`CHADIA Projects — Bundle de candidature`);
    lines.push(`=========================================`);
    lines.push(``);
    lines.push(`Référence       : ${c.reference}`);
    lines.push(`Titre           : ${c.titre}`);
    lines.push(`Statut          : ${c.statut}`);
    if (c.opportunite) {
      lines.push(``);
      lines.push(`Opportunité     : ${c.opportunite.titre}`);
      lines.push(`Bailleur        : ${c.opportunite.bailleur?.nom || c.opportunite.bailleurNom || "—"}`);
      lines.push(`Source          : ${c.opportunite.sourceConnector || "—"}`);
      if (c.opportunite.dateLimiteDepot) {
        lines.push(`Date limite     : ${new Date(c.opportunite.dateLimiteDepot).toISOString().slice(0, 10)}`);
      }
      if (c.opportunite.sourceUrl) {
        lines.push(`URL d'origine   : ${c.opportunite.sourceUrl}`);
      }
    }
    lines.push(``);
    lines.push(`Coordinateur    : ${c.coordinateurId || "—"}`);
    lines.push(`Équipe          : ${(c.equipe || []).join(", ") || "—"}`);
    if (c.partenaires?.length) lines.push(`Partenaires     : ${c.partenaires.join(", ")}`);
    if (c.budgetDemande) {
      lines.push(`Budget demandé  : ${c.budgetDemande} ${c.devise || ""}`);
    }
    if (c.coFinancement) {
      lines.push(`Co-financement  : ${c.coFinancement} ${c.devise || ""}`);
    }
    if (c.dureeMois) lines.push(`Durée prévue    : ${c.dureeMois} mois`);
    if (c.dateDepotPrevu) {
      lines.push(`Dépôt prévu     : ${new Date(c.dateDepotPrevu).toISOString().slice(0, 10)}`);
    }
    lines.push(``);
    lines.push(`Export généré le ${new Date().toISOString()} par ${req.user.email || req.user.id}`);
    lines.push(``);
    lines.push(`Pièces jointes (${c.documents.length})`);
    lines.push(`---`);
    if (c.documents.length === 0) {
      lines.push(`Aucune pièce jointe`);
    }
    for (const d of c.documents) {
      lines.push(`- [${d.category}] ${d.nom}${d.version ? ` (v${d.version})` : ""}`);
    }
    if (c.noteConcept) {
      lines.push(``);
      lines.push(`Note conceptuelle`);
      lines.push(`---`);
      lines.push(c.noteConcept);
    }
    if (c.methodologie) {
      lines.push(``);
      lines.push(`Méthodologie`);
      lines.push(`---`);
      lines.push(c.methodologie);
    }
    archive.append(lines.join("\n"), { name: "MANIFEST.txt" });

    // ---- Ajout des pièces, regroupées par catégorie ----
    // Nommage : <catégorie>/<nom_original_ou_nom>.<ext>
    // On dédup avec un compteur si plusieurs documents ont le même nom.
    const usedNames = new Set();
    for (const d of c.documents) {
      if (!d.cheminLocal || !fs.existsSync(d.cheminLocal)) {
        console.warn(`[zip] fichier physique manquant pour doc ${d.id}`);
        continue;
      }
      const folder = (d.category || "AUTRE").toLowerCase().replace(/_/g, "-");
      const baseName = (d.originalName || d.nom).replace(/[/\\]/g, "_");
      let entryName = `${folder}/${baseName}`;
      let n = 1;
      while (usedNames.has(entryName)) {
        const dot = baseName.lastIndexOf(".");
        const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
        const ext = dot > 0 ? baseName.slice(dot) : "";
        entryName = `${folder}/${stem}-${n}${ext}`;
        n++;
      }
      usedNames.add(entryName);
      archive.file(d.cheminLocal, { name: entryName });
    }

    await archive.finalize();
  } catch (e) {
    console.error("[zip] échec :", e.message);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    } else {
      try { archive?.abort?.(); res.end(); } catch { /* ignore */ }
    }
  }
});

// POST /candidatures — création (souvent depuis une opportunité)
app.post("/candidatures", auth, async (req, res) => {
  try {
    const b = req.body;
    if (!b.titre) return res.status(400).json({ error: "titre required" });

    // Si on candidate sur une opportunité, on vérifie qu'elle n'est pas déjà liée
    if (b.opportuniteId) {
      const existing = await prisma.candidature.findUnique({ where: { opportuniteId: b.opportuniteId } });
      if (existing) return res.status(409).json({ error: "Une candidature existe déjà pour cette opportunité", id: existing.id });
    }

    // Tentatives de génération d'une référence unique
    let reference = b.reference || nextCandidatureRef();
    for (let attempts = 0; attempts < 5; attempts++) {
      const clash = await prisma.candidature.findUnique({ where: { reference } });
      if (!clash) break;
      reference = nextCandidatureRef();
    }

    const data = {
      ...b,
      reference,
      createdBy: req.user.id,
      dateDepotPrevu: b.dateDepotPrevu ? new Date(b.dateDepotPrevu) : null,
    };
    const cand = await prisma.candidature.create({ data });

    // Si on a lié une opportunité, on la passe en CANDIDATEE
    if (b.opportuniteId) {
      await prisma.opportunite.update({
        where: { id: b.opportuniteId },
        data: { statut: "CANDIDATEE", decideePar: req.user.id, decideeAt: new Date() },
      });
    }

    await publishEvent("candidature.created", { id: cand.id, reference: cand.reference, opportuniteId: cand.opportuniteId });
    res.status(201).json({ candidature: cand });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /candidatures/:id/pieces/:pieceId/content — autosave du contenu rédigé
// pour UNE pièce de l'arborescence. Stocké dans Candidature.pieceContents
// sous forme { [pieceId]: { html, updatedAt, savedBy } }.
// Body : { html: string }
// On limite la taille du HTML pour éviter l'abus mémoire (200 KB max).
app.put("/candidatures/:id/pieces/:pieceId/content", auth, requireRole("ADMIN", "DIRECTEUR", "FINANCIER"), async (req, res) => {
  try {
    const rawHtml = String(req.body?.html ?? "");
    if (rawHtml.length > 200_000) {
      return res.status(413).json({ error: "Contenu trop volumineux (max 200 Ko)" });
    }
    // P0 sécurité : re-sanitize côté serveur. Le client le fait déjà avec
    // DOMPurify, mais un attaquant qui contourne le client (monkey-patch,
    // appel direct API) injecterait du HTML brut. Défense en profondeur.
    const html = sanitizeRichHtml(rawHtml);

    const cand = await prisma.candidature.findUnique({
      where: { id: req.params.id },
      select: { id: true, pieceContents: true },
    });
    if (!cand) return res.status(404).json({ error: "Candidature introuvable" });

    const pieceId = req.params.pieceId;
    if (!pieceId || pieceId.length > 80) {
      return res.status(400).json({ error: "pieceId invalide" });
    }

    const current = (cand.pieceContents && typeof cand.pieceContents === "object") ? cand.pieceContents : {};
    const savedAt = new Date().toISOString();
    const next = {
      ...current,
      [pieceId]: { html, updatedAt: savedAt, savedBy: req.user.id },
    };

    await prisma.candidature.update({
      where: { id: cand.id },
      data: { pieceContents: next, updatedAt: new Date() },
    });

    res.json({ ok: true, pieceId, savedAt });
  } catch (e) {
    console.error("[pieceContent] échec :", e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /candidatures/:id/pieces/:pieceId/export-docx — exporte le contenu HTML
// rédigé pour UNE pièce en fichier Word (.docx) téléchargeable.
// Conversion via la lib html-to-docx (HTML simple → docx).
app.get("/candidatures/:id/pieces/:pieceId/export-docx", auth, async (req, res) => {
  try {
    const cand = await prisma.candidature.findUnique({
      where: { id: req.params.id },
      select: { id: true, reference: true, titre: true, pieceContents: true, piecesOverrides: true },
    });
    if (!cand) return res.status(404).json({ error: "Candidature introuvable" });

    const pieceId = req.params.pieceId;
    const pieceContents = (cand.pieceContents && typeof cand.pieceContents === "object") ? cand.pieceContents : {};
    const entry = pieceContents[pieceId];
    if (!entry || !entry.html) {
      return res.status(404).json({ error: "Aucun contenu rédigé pour cette pièce" });
    }

    // On enveloppe le HTML dans un wrapper complet (html-to-docx attend du
    // HTML structuré). Le style minimal donne un rendu Word lisible.
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(cand.reference || cand.titre || "Pièce")}</title>
<style>
  body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; color: #222; }
  h1 { font-size: 18pt; margin-bottom: 8pt; }
  h2 { font-size: 14pt; margin-top: 14pt; margin-bottom: 6pt; }
  h3 { font-size: 12pt; margin-top: 10pt; margin-bottom: 4pt; }
  p { margin: 4pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  td, th { border: 1px solid #888; padding: 4pt 6pt; }
  ul, ol { margin: 6pt 0 6pt 20pt; }
</style></head><body>${entry.html}</body></html>`;

    // Lazy require pour ne pas pénaliser le démarrage du service si la lib
    // n'est pas encore installée (rétro-compatible).
    let HTMLtoDOCX;
    try {
      HTMLtoDOCX = require("html-to-docx");
    } catch (err) {
      return res.status(503).json({ error: "Conversion DOCX indisponible (lib non installée)" });
    }

    const buffer = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: false,
    });

    const safeName = (cand.reference || cand.titre || "candidature").replace(/[^\w-]+/g, "_").slice(0, 60);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_${pieceId}.docx"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (e) {
    console.error("[export-docx] échec :", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Helper d'échappement HTML pour le titre du document.
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// PATCH /candidatures/:id/pieces — édition de l'arborescence des pièces
// Forme du body :
//   { action: "add", piece: { nom, description, categorie, ... } }
//   { action: "update", id: "piece-id", patch: { nom?, description?, ... } }
//   { action: "remove", id: "piece-id" }
// Le résultat (added/updated/removed) est stocké dans Candidature.piecesOverrides.
// Le client (gateway) fusionne avec opp.rawPayload._chadia.analysis.piecesRequises.
app.patch("/candidatures/:id/pieces", auth, requireRole("ADMIN", "DIRECTEUR", "FINANCIER"), async (req, res) => {
  try {
    const cand = await prisma.candidature.findUnique({ where: { id: req.params.id } });
    if (!cand) return res.status(404).json({ error: "Candidature introuvable" });

    const { action, piece, id, patch } = req.body || {};
    if (!action) return res.status(400).json({ error: "action requise (add|update|remove)" });

    // État courant des overrides (initialisé proprement si absent)
    const overrides = cand.piecesOverrides && typeof cand.piecesOverrides === "object"
      ? { added: [], updated: {}, removed: [], ...cand.piecesOverrides }
      : { added: [], updated: {}, removed: [] };

    if (action === "add") {
      if (!piece || !piece.nom) return res.status(400).json({ error: "piece.nom requis" });
      // Génère un id stable basé sur le nom (slug) pour le matching futur
      const slug = (piece.id || piece.nom)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) + "-" + crypto.randomBytes(3).toString("hex");
      const newPiece = {
        id: slug,
        nom: String(piece.nom).trim(),
        description: piece.description ? String(piece.description).trim() : null,
        categorie: ["A", "B", "C", "D", "E"].includes(piece.categorie) ? piece.categorie : "E",
        type: piece.type || "ANNEXE",
        obligatoire: piece.obligatoire !== false,
        format: piece.format || "DOCX",
        _custom: true,                  // marqueur "pièce ajoutée par CHADIA"
      };
      overrides.added.push(newPiece);
    } else if (action === "update") {
      if (!id) return res.status(400).json({ error: "id requis pour update" });
      if (!patch || typeof patch !== "object") return res.status(400).json({ error: "patch requis" });
      const cleanPatch = {};
      for (const k of ["nom", "description", "categorie", "type", "obligatoire", "format"]) {
        if (patch[k] !== undefined) cleanPatch[k] = patch[k];
      }
      // Si la pièce est dans added → on patch direct dans la liste added
      const idxAdded = overrides.added.findIndex((p) => p.id === id);
      if (idxAdded >= 0) {
        overrides.added[idxAdded] = { ...overrides.added[idxAdded], ...cleanPatch };
      } else {
        // Sinon (pièce venant de l'analyse Mistral), on ajoute le patch dans updated
        overrides.updated[id] = { ...(overrides.updated[id] || {}), ...cleanPatch };
      }
    } else if (action === "remove") {
      if (!id) return res.status(400).json({ error: "id requis pour remove" });
      // Si c'est une pièce ajoutée manuellement → on la retire de added
      const idxAdded = overrides.added.findIndex((p) => p.id === id);
      if (idxAdded >= 0) {
        overrides.added.splice(idxAdded, 1);
      } else {
        // Sinon → on la marque comme supprimée (la fusion la filtrera)
        if (!overrides.removed.includes(id)) overrides.removed.push(id);
      }
      // Nettoyer les updated correspondants
      delete overrides.updated[id];
    } else {
      return res.status(400).json({ error: `action inconnue: ${action}` });
    }

    const updated = await prisma.candidature.update({
      where: { id: cand.id },
      data: { piecesOverrides: overrides },
      select: { id: true, piecesOverrides: true },
    });
    res.json({ ok: true, piecesOverrides: updated.piecesOverrides });
  } catch (e) {
    console.error("[pieces] échec :", e.message);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /candidatures/:id — mise à jour des sections + statut
// P0 sécurité : on n'accepte QUE les champs whitelistés. Avant on faisait
// `{ ...b }` qui permettait à un client d'injecter n'importe quel champ
// Prisma (createdBy, reference, opportuniteId, statut sans validation…).
// Seuls ADMIN/DIRECTEUR/FINANCIER peuvent éditer.
const ALLOWED_CANDIDATURE_FIELDS = new Set([
  "titre", "description", "statut", "coordinateurId", "equipe",
  "noteConcept", "methodologie", "partenaires",
  "budgetDemande", "coFinancement", "devise", "dureeMois",
  "dateDepotPrevu", "dateDepotEffectif", "dateResultat",
  "commentairesBailleur",
  "piecesOverrides", "pieceContents", "qaThread",
]);
const ALLOWED_STATUTS = new Set([
  "BROUILLON", "EN_REDACTION", "EN_VALIDATION", "SOUMISE",
  "ATTRIBUEE", "NON_RETENUE", "ABANDONNEE",
]);

app.patch("/candidatures/:id", auth, requireRole("ADMIN", "DIRECTEUR", "FINANCIER"), async (req, res) => {
  try {
    const b = req.body || {};
    const data = {};
    // Whitelist explicite des champs
    for (const k of Object.keys(b)) {
      if (ALLOWED_CANDIDATURE_FIELDS.has(k)) data[k] = b[k];
    }
    // Validation du statut s'il est posé
    if (data.statut && !ALLOWED_STATUTS.has(data.statut)) {
      return res.status(400).json({ error: `Statut invalide: ${data.statut}` });
    }
    // Bornes simples sur les chaînes pour éviter les payloads abusifs
    for (const k of ["titre", "description", "noteConcept", "methodologie", "commentairesBailleur"]) {
      if (typeof data[k] === "string" && data[k].length > 50000) {
        return res.status(400).json({ error: `Champ ${k} trop long (max 50000 caractères)` });
      }
    }
    // P0 sécurité : sanitize les champs susceptibles de contenir du HTML.
    // noteConcept et methodologie sont rendus en HTML dans le viewer (mode
    // narratif). titre/description/commentaires restent texte brut, mais on
    // strip tout HTML par précaution.
    for (const k of ["noteConcept", "methodologie"]) {
      if (typeof data[k] === "string") data[k] = sanitizeRichHtml(data[k]);
    }
    for (const k of ["titre", "description", "commentairesBailleur"]) {
      if (typeof data[k] === "string") data[k] = stripAllHtml(data[k]);
    }
    // Bornes sur les tableaux Json
    if (Array.isArray(data.qaThread) && data.qaThread.length > 200) {
      return res.status(400).json({ error: "qaThread trop volumineux (max 200 entrées)" });
    }

    if (data.dateDepotPrevu) data.dateDepotPrevu = new Date(data.dateDepotPrevu);
    if (data.dateDepotEffectif) data.dateDepotEffectif = new Date(data.dateDepotEffectif);
    if (data.dateResultat) data.dateResultat = new Date(data.dateResultat);

    const cand = await prisma.candidature.update({ where: { id: req.params.id }, data });

    if (data.statut === "SOUMISE") await publishEvent("candidature.submitted", { id: cand.id, reference: cand.reference });
    if (data.statut === "ATTRIBUEE") await publishEvent("candidature.awarded", { id: cand.id, reference: cand.reference });
    if (data.statut === "NON_RETENUE") await publishEvent("candidature.rejected", { id: cand.id, reference: cand.reference });

    res.json({ candidature: cand });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /candidatures/:id
app.delete("/candidatures/:id", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    await prisma.candidature.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// DOCUMENTS (gestion fluide)
// ============================================================

// GET /documents — liste avec filtres + visibilité
app.get("/documents", auth, async (req, res) => {
  try {
    const { projetId, opportuniteId, candidatureId, type, category, visibility, q, isPinned, page = "1", limit = "50" } = req.query;
    const where = {};
    if (projetId) where.projetId = projetId;
    if (opportuniteId) where.opportuniteId = opportuniteId;
    if (candidatureId) where.candidatureId = candidatureId;
    if (type) where.type = type;
    if (category) where.category = category;
    if (visibility) where.visibility = visibility;
    if (isPinned === "true") where.isPinned = true;
    if (q) {
      where.OR = [
        { nom: { contains: q, mode: "insensitive" } },
        { originalName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }
    // Contrôle d'accès : CONFIDENTIEL réservé ADMIN/DIRECTEUR
    if (!["ADMIN", "DIRECTEUR"].includes(req.user.role)) {
      where.visibility = where.visibility ? where.visibility : { in: ["PUBLIC", "INTERNE"] };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.document.count({ where }),
    ]);
    res.json({ documents, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /documents/upload — upload multipart (fichier + metadata)
app.post("/documents/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

    // Calcul hash SHA-256 pour dédoublonnage éventuel
    let hash = null;
    try {
      const buf = fs.readFileSync(req.file.path);
      hash = crypto.createHash("sha256").update(buf).digest("hex");
    } catch { /* ignore */ }

    const data = {
      nom: req.body?.nom || req.file.originalname,
      originalName: req.file.originalname,
      type: req.body?.type || "AUTRE",
      category: req.body?.category || "AUTRE",
      visibility: req.body?.visibility || "INTERNE",
      mimeType: req.file.mimetype,
      taille: req.file.size,
      cheminLocal: req.file.path,
      url: `/documents/${req.file.filename}`,
      hash,
      version: req.body?.version || "1.0",
      description: req.body?.description || null,
      tags: req.body?.tags ? String(req.body.tags).split(",").map(t => t.trim()).filter(Boolean) : [],
      isPinned: req.body?.isPinned === "true",
      projetId: req.body?.projetId || null,
      opportuniteId: req.body?.opportuniteId || null,
      candidatureId: req.body?.candidatureId || null,
      pieceId: req.body?.pieceId || null,
      uploadedBy: req.user.id,
    };

    const doc = await prisma.document.create({ data });
    res.status(201).json({ document: doc });
  } catch (e) {
    // Cleanup du fichier si insertion DB a échoué
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    res.status(400).json({ error: e.message });
  }
});

// POST /documents — création par metadata seule (sans fichier, ex: lien externe)
app.post("/documents", auth, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.nom || !body.url) return res.status(400).json({ error: "nom et url requis" });
    const doc = await prisma.document.create({
      data: { ...body, uploadedBy: req.user.id },
    });
    res.status(201).json({ document: doc });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /documents/:id — métadonnées
app.get("/documents/:id", auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: "Document introuvable" });
    if (doc.visibility === "CONFIDENTIEL" && !["ADMIN", "DIRECTEUR"].includes(req.user.role)) {
      return res.status(403).json({ error: "Accès confidentiel refusé" });
    }
    res.json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /documents/:id/file — servir le fichier binaire
app.get("/documents/:id/file", auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: "Document introuvable" });
    if (doc.visibility === "CONFIDENTIEL" && !["ADMIN", "DIRECTEUR"].includes(req.user.role)) {
      return res.status(403).json({ error: "Accès confidentiel refusé" });
    }
    if (!doc.cheminLocal || !fs.existsSync(doc.cheminLocal)) {
      return res.status(404).json({ error: "Fichier physique introuvable" });
    }
    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName || doc.nom)}"`);
    fs.createReadStream(doc.cheminLocal).pipe(res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /documents/:id — édition métadonnées (renommer, pin, changer visibilité)
app.patch("/documents/:id", auth, async (req, res) => {
  try {
    const { nom, description, tags, isPinned, visibility, category, type } = req.body || {};
    const data = {};
    if (nom !== undefined) data.nom = nom;
    if (description !== undefined) data.description = description;
    if (Array.isArray(tags)) data.tags = tags;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (visibility !== undefined) data.visibility = visibility;
    if (category !== undefined) data.category = category;
    if (type !== undefined) data.type = type;
    const doc = await prisma.document.update({ where: { id: req.params.id }, data });
    res.json({ document: doc });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// DELETE /documents/:id — suppression (fichier + DB)
app.delete("/documents/:id", auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: "Document introuvable" });
    if (doc.cheminLocal && fs.existsSync(doc.cheminLocal)) {
      try { fs.unlinkSync(doc.cheminLocal); } catch { /* ignore */ }
    }
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: "Document supprimé" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// PROJETS (programmes portés par l'ONG)
// ============================================================

// GET /projets — liste avec filtres et tri par défaut récent → ancien
app.get("/projets", auth, async (req, res) => {
  try {
    const { q, statut, domaine, zone, urgent } = req.query;
    const where = {};
    if (statut) where.statut = statut;
    if (domaine) where.domaine = domaine;
    if (zone) where.zone = { contains: zone, mode: "insensitive" };
    if (urgent === "true") where.urgent = true;
    if (q) {
      where.OR = [
        { titre: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
      ];
    }
    const [projets, total] = await Promise.all([
      prisma.projet.findMany({ where, orderBy: [{ urgent: "desc" }, { createdAt: "desc" }] }),
      prisma.projet.count({ where }),
    ]);
    res.json({ projets, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /projets/:id — détail d'un projet
app.get("/projets/:id", auth, async (req, res) => {
  try {
    const projet = await prisma.projet.findUnique({ where: { id: req.params.id } });
    if (!projet) return res.status(404).json({ error: "Projet introuvable" });
    res.json({ projet });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /projets — créer un projet (ADMIN ou DIRECTEUR)
app.post("/projets", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const data = req.body || {};
    // Génération auto de la référence si non fournie : PRJ-{ANNEE}-{NUM:2}
    let reference = data.reference;
    if (!reference) {
      const annee = new Date().getFullYear();
      const last = await prisma.projet.findFirst({
        where: { reference: { startsWith: `PRJ-${annee}-` } },
        orderBy: { reference: "desc" },
      });
      const lastNum = last ? parseInt(last.reference.split("-").pop(), 10) || 0 : 0;
      reference = `PRJ-${annee}-${String(lastNum + 1).padStart(2, "0")}`;
    }
    const projet = await prisma.projet.create({
      data: {
        reference,
        titre: data.titre,
        description: data.description || null,
        zone: data.zone || null,
        domaine: data.domaine || "AUTRE",
        statut: data.statut || "MONTAGE",
        urgent: data.urgent === true,
        bailleurs: Array.isArray(data.bailleurs) ? data.bailleurs : [],
        team: Array.isArray(data.team) ? data.team : [],
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        echeance: data.echeance || null,
        avancement: typeof data.avancement === "number" ? data.avancement : 0,
        etapeLabel: data.etapeLabel || null,
        budgetEstime: data.budgetEstime ?? null,
        budgetRealise: data.budgetRealise ?? null,
        devise: data.devise || "FCFA",
        beneficiaires: data.beneficiaires ?? null,
        createdBy: req.user?.id || null,
      },
    });
    // Outbox event pour le service notification
    await prisma.outboxEvent.create({
      data: {
        eventType: "projet.created",
        payload: { projetId: projet.id, reference: projet.reference, titre: projet.titre },
      },
    });
    res.status(201).json({ projet });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PUT /projets/:id — mise à jour complète (ADMIN ou DIRECTEUR)
app.put("/projets/:id", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const data = req.body || {};
    const projet = await prisma.projet.update({
      where: { id: req.params.id },
      data: {
        ...(data.titre !== undefined && { titre: data.titre }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.zone !== undefined && { zone: data.zone }),
        ...(data.domaine !== undefined && { domaine: data.domaine }),
        ...(data.statut !== undefined && { statut: data.statut }),
        ...(data.urgent !== undefined && { urgent: data.urgent }),
        ...(Array.isArray(data.bailleurs) && { bailleurs: data.bailleurs }),
        ...(Array.isArray(data.team) && { team: data.team }),
        ...(data.dateDebut !== undefined && { dateDebut: data.dateDebut ? new Date(data.dateDebut) : null }),
        ...(data.dateFin !== undefined && { dateFin: data.dateFin ? new Date(data.dateFin) : null }),
        ...(data.dateCloture !== undefined && { dateCloture: data.dateCloture ? new Date(data.dateCloture) : null }),
        ...(data.echeance !== undefined && { echeance: data.echeance }),
        ...(data.avancement !== undefined && { avancement: data.avancement }),
        ...(data.etapeLabel !== undefined && { etapeLabel: data.etapeLabel }),
        ...(data.budgetEstime !== undefined && { budgetEstime: data.budgetEstime }),
        ...(data.budgetRealise !== undefined && { budgetRealise: data.budgetRealise }),
        ...(data.devise !== undefined && { devise: data.devise }),
        ...(data.beneficiaires !== undefined && { beneficiaires: data.beneficiaires }),
      },
    });
    res.json({ projet });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH /projets/:id/avancement — quick update (avancement seul)
app.patch("/projets/:id/avancement", auth, async (req, res) => {
  try {
    const { avancement, etapeLabel } = req.body || {};
    const projet = await prisma.projet.update({
      where: { id: req.params.id },
      data: {
        ...(typeof avancement === "number" && { avancement }),
        ...(etapeLabel !== undefined && { etapeLabel }),
      },
    });
    res.json({ projet });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// DELETE /projets/:id — suppression (DIRECTEUR uniquement)
app.delete("/projets/:id", auth, requireRole("DIRECTEUR"), async (req, res) => {
  try {
    await prisma.projet.delete({ where: { id: req.params.id } });
    res.json({ message: "Projet supprimé" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// SETTINGS (paramètres clé-valeur de la plateforme)
// ============================================================

// Préfixes de clés sensibles — lisibles uniquement par ADMIN/DIRECTEUR/FINANCIER.
// Le profil organisation (org.profile) contient récépissé, budget, références
// bailleurs — PII et secrets commerciaux à ne pas exposer aux MEMBRE.
const SENSITIVE_SETTING_PREFIXES = ["org.", "branding.", "contact.", "integration."];
function isSensitiveSettingKey(key) {
  return SENSITIVE_SETTING_PREFIXES.some((p) => key.startsWith(p));
}
function canReadSetting(role, key) {
  if (!isSensitiveSettingKey(key)) return true;
  return role === "ADMIN" || role === "DIRECTEUR" || role === "FINANCIER";
}

// GET /settings — toutes les settings (auth requise)
// Filtres optionnels : category, prefix (commence par "org.", "workflow."…)
app.get("/settings", auth, async (req, res) => {
  try {
    const { category, prefix } = req.query;
    const where = {};
    if (category) where.category = category;
    if (prefix) where.key = { startsWith: prefix };
    const settings = await prisma.setting.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
    // P0 sécu : filtre les clés sensibles selon le rôle.
    const visible = settings.filter((s) => canReadSetting(req.user.role, s.key));
    const asMap = {};
    for (const s of visible) asMap[s.key] = s.value;
    res.json({ settings: visible, map: asMap });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /settings/:key — valeur d'une clé spécifique
app.get("/settings/:key", auth, async (req, res) => {
  try {
    if (!canReadSetting(req.user.role, req.params.key)) {
      return res.status(403).json({ error: "Accès refusé à cette configuration" });
    }
    const s = await prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!s) return res.status(404).json({ error: "Setting introuvable" });
    res.json({ setting: s });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /settings/:key — créer ou mettre à jour une clé (ADMIN/DIRECTEUR)
app.put("/settings/:key", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const { value, category, label, description } = req.body || {};
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: {
        ...(value !== undefined && { value }),
        ...(category !== undefined && { category }),
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        updatedBy: req.user?.id || null,
      },
      create: {
        key: req.params.key,
        value: value ?? null,
        category: category || "OTHER",
        label: label || null,
        description: description || null,
        updatedBy: req.user?.id || null,
      },
    });
    res.json({ setting });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH /settings — mise à jour bulk (form section entière)
// Body : { entries: { "org.denomination": "...", "workflow.publication_auto": true } }
app.patch("/settings", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const { entries } = req.body || {};
    if (!entries || typeof entries !== "object") {
      return res.status(400).json({ error: "Body doit contenir un objet `entries`" });
    }
    const updated = [];
    for (const [key, value] of Object.entries(entries)) {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value, updatedBy: req.user?.id || null },
        create: { key, value, updatedBy: req.user?.id || null, category: "OTHER" },
      });
      updated.push(setting);
    }
    res.json({ updated, count: updated.length });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// DELETE /settings/:key — supprimer une clé (DIRECTEUR seul)
app.delete("/settings/:key", auth, requireRole("DIRECTEUR"), async (req, res) => {
  try {
    await prisma.setting.delete({ where: { key: req.params.key } });
    res.json({ message: "Setting supprimé" });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// OUTBOX (pour le notification service)
// ============================================================

// GET /outbox?unprocessed=true
app.get("/outbox", auth, requireRole("DIRECTEUR"), async (req, res) => {
  try {
    const where = req.query.unprocessed === "true" ? { processed: false } : {};
    const events = await prisma.outboxEvent.findMany({ where, orderBy: { createdAt: "asc" }, take: 100 });
    res.json({ events });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /outbox/:id/processed
app.patch("/outbox/:id/processed", auth, async (req, res) => {
  try {
    await prisma.outboxEvent.update({ where: { id: req.params.id }, data: { processed: true, processedAt: new Date() } });
    res.json({ message: "Processed" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`Tender service running on port ${PORT}`);
  startCron({ prisma, runAllConnectors });
});
