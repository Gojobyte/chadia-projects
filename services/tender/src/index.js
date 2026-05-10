const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("./generated/prisma");

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
    // Subfolder par entité (projet/AO/fournisseur) si fourni
    const sub = req.body?.projetId || req.body?.appelOffreId || req.body?.fournisseurId || "lib";
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
app.use(express.json());

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

function generateRef(prefix = "AO") {
  const d = new Date();
  return `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

// ============================================================
// FOURNISSEURS
// ============================================================

// GET /fournisseurs
app.get("/fournisseurs", auth, async (req, res) => {
  try {
    const { q, statut, categorie, page = "1", limit = "20" } = req.query;
    const where = {};
    if (q) where.OR = [
      { raisonSociale: { contains: q, mode: "insensitive" } },
      { sigle: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
    if (statut) where.statut = statut;
    if (categorie) where.categorie = categorie;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [fournisseurs, total] = await Promise.all([
      prisma.fournisseur.findMany({
        where,
        include: { _count: { select: { soumissions: true, evaluations: true, documents: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.fournisseur.count({ where }),
    ]);
    res.json({ fournisseurs, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /fournisseurs
app.post("/fournisseurs", auth, async (req, res) => {
  try {
    const { body } = req;
    if (!body.email || !body.raisonSociale) return res.status(400).json({ error: "email and raisonSociale required" });
    const existing = await prisma.fournisseur.findUnique({ where: { email: body.email } });
    if (existing) return res.status(409).json({ error: "Email already exists" });
    const fournisseur = await prisma.fournisseur.create({ data: body });
    res.status(201).json({ fournisseur });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /fournisseurs/:id
app.get("/fournisseurs/:id", auth, async (req, res) => {
  try {
    const f = await prisma.fournisseur.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { soumissions: true, evaluations: true, documents: true } },
        soumissions: { include: { appelOffre: { select: { reference: true, titre: true } } }, take: 10, orderBy: { createdAt: "desc" } },
        documents: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    if (!f) return res.status(404).json({ error: "Not found" });
    res.json({ fournisseur: f });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /fournisseurs/:id
app.put("/fournisseurs/:id", auth, async (req, res) => {
  try {
    const f = await prisma.fournisseur.update({ where: { id: req.params.id }, data: req.body });
    res.json({ fournisseur: f });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /fournisseurs/:id/verify
app.patch("/fournisseurs/:id/verify", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const f = await prisma.fournisseur.update({
      where: { id: req.params.id },
      data: { statut: "VERIFIE", verifiePar: req.user.id, verifieAt: new Date() },
    });
    res.json({ fournisseur: f });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
// APPELS D'OFFRES
// ============================================================

// GET /appels-offres (public if ?public=true, otherwise auth)
app.get("/appels-offres", async (req, res) => {
  try {
    const { q, statut, type, categorie, secteur, bailleurId, page = "1", limit = "20", public: pub } = req.query;
    const where = {};
    if (pub === "true") where.estPublic = true;
    if (q) where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { titre: { contains: q, mode: "insensitive" } },
    ];
    if (statut) where.statut = statut;
    if (type) where.type = type;
    if (categorie) where.categorie = categorie;
    if (secteur) where.secteur = secteur;
    if (bailleurId) where.bailleurId = bailleurId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [appelsOffres, total] = await Promise.all([
      prisma.appelOffre.findMany({
        where,
        include: {
          bailleur: { select: { nom: true, sigle: true } },
          _count: { select: { soumissions: true, documents: true } },
        },
        orderBy: { dateLimiteDepot: "asc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.appelOffre.count({ where }),
    ]);
    res.json({ appelsOffres, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /appels-offres
app.post("/appels-offres", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const body = req.body;
    if (!body.titre || !body.description || !body.bailleurId || !body.dateLimiteDepot) {
      return res.status(400).json({ error: "titre, description, bailleurId, dateLimiteDepot required" });
    }
    const reference = body.reference || generateRef();
    const existing = await prisma.appelOffre.findUnique({ where: { reference } });
    if (existing) return res.status(409).json({ error: "Reference already exists" });

    const appelOffre = await prisma.appelOffre.create({
      data: {
        ...body,
        reference,
        dateLimiteDepot: new Date(body.dateLimiteDepot),
        dateOuverture: body.dateOuverture ? new Date(body.dateOuverture) : null,
        createdBy: req.user.id,
      },
    });

    await publishEvent("tender.created", { id: appelOffre.id, reference, titre: appelOffre.titre, bailleurId: appelOffre.bailleurId });
    res.status(201).json({ appelOffre });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /appels-offres/:id
app.get("/appels-offres/:id", async (req, res) => {
  try {
    const ao = await prisma.appelOffre.findUnique({
      where: { id: req.params.id },
      include: {
        bailleur: true,
        soumissions: {
          include: { fournisseur: { select: { raisonSociale: true, sigle: true, statut: true } } },
          orderBy: { noteGlobale: "desc" },
        },
        documents: { orderBy: { createdAt: "desc" } },
        resultats: true,
        _count: { select: { soumissions: true, documents: true } },
      },
    });
    if (!ao) return res.status(404).json({ error: "Not found" });
    res.json({ appelOffre: ao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /appels-offres/:id
app.put("/appels-offres/:id", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const body = req.body;
    if (body.dateLimiteDepot) body.dateLimiteDepot = new Date(body.dateLimiteDepot);
    if (body.dateOuverture) body.dateOuverture = new Date(body.dateOuverture);
    const ao = await prisma.appelOffre.update({ where: { id: req.params.id }, data: body });
    res.json({ appelOffre: ao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /appels-offres/:id
app.delete("/appels-offres/:id", auth, requireRole("DIRECTEUR"), async (req, res) => {
  try {
    await prisma.appelOffre.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /appels-offres/:id/publish
app.patch("/appels-offres/:id/publish", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const ao = await prisma.appelOffre.update({
      where: { id: req.params.id },
      data: { statut: "PUBLIE", estPublic: true },
    });
    await publishEvent("tender.published", { id: ao.id, reference: ao.reference });
    res.json({ appelOffre: ao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /resultats — page publique : marchés attribués
app.get("/resultats", async (req, res) => {
  try {
    const { bailleurId, secteur, limit = "50" } = req.query;
    const where = { estPublic: true };
    if (bailleurId || secteur) {
      where.appelOffre = {};
      if (bailleurId) where.appelOffre.bailleurId = bailleurId;
      if (secteur) where.appelOffre.secteur = secteur;
    }
    const resultats = await prisma.appelOffreResultat.findMany({
      where,
      include: {
        appelOffre: {
          select: {
            reference: true, titre: true, type: true, categorie: true, secteur: true,
            budgetEstime: true, devise: true, datePublication: true,
            bailleur: { select: { nom: true, sigle: true } },
          },
        },
      },
      orderBy: { publieAt: "desc" },
      take: parseInt(limit),
    });
    res.json({ resultats, total: resultats.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SOUMISSIONS
// ============================================================

// GET /soumissions
app.get("/soumissions", auth, async (req, res) => {
  try {
    const { appelOffreId, fournisseurId, statut, page = "1", limit = "20" } = req.query;
    const where = {};
    if (appelOffreId) where.appelOffreId = appelOffreId;
    if (fournisseurId) where.fournisseurId = fournisseurId;
    if (statut) where.statut = statut;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [soumissions, total] = await Promise.all([
      prisma.soumission.findMany({
        where,
        include: {
          appelOffre: { select: { reference: true, titre: true, dateLimiteDepot: true } },
          fournisseur: { select: { raisonSociale: true, sigle: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.soumission.count({ where }),
    ]);
    res.json({ soumissions, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /soumissions
app.post("/soumissions", auth, async (req, res) => {
  try {
    const body = req.body;
    if (!body.appelOffreId || !body.fournisseurId) return res.status(400).json({ error: "appelOffreId and fournisseurId required" });

    const ao = await prisma.appelOffre.findUnique({ where: { id: body.appelOffreId } });
    if (!ao) return res.status(404).json({ error: "Appel d'offre not found" });
    if (ao.statut !== "PUBLIE" && ao.statut !== "EN_COURS") return res.status(400).json({ error: "Not open for submissions" });
    if (new Date(ao.dateLimiteDepot) < new Date()) return res.status(400).json({ error: "Deadline passed" });

    const fournisseur = await prisma.fournisseur.findUnique({ where: { id: body.fournisseurId } });
    if (!fournisseur || fournisseur.statut !== "VERIFIE") return res.status(400).json({ error: "Fournisseur not verified" });

    const existing = await prisma.soumission.findUnique({
      where: { appelOffreId_fournisseurId: { appelOffreId: body.appelOffreId, fournisseurId: body.fournisseurId } },
    });
    if (existing) return res.status(409).json({ error: "Already submitted" });

    const numeroSoumission = `SOU-${Date.now()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
    const soumission = await prisma.soumission.create({
      data: { ...body, numeroSoumission, statut: "DEPOSEE", deposeAt: new Date() },
    });

    await publishEvent("submission.received", { id: soumission.id, appelOffreId: ao.id, fournisseurId: body.fournisseurId });
    res.status(201).json({ soumission });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /soumissions/:id
app.get("/soumissions/:id", auth, async (req, res) => {
  try {
    const s = await prisma.soumission.findUnique({
      where: { id: req.params.id },
      include: {
        appelOffre: { include: { bailleur: true } },
        fournisseur: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json({ soumission: s });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /soumissions/:id/evaluate
app.put("/soumissions/:id/evaluate", auth, requireRole("ADMIN", "DIRECTEUR"), async (req, res) => {
  try {
    const { noteTechnique, noteFinanciere, noteGlobale, classement, commentairesEvaluation } = req.body;
    const s = await prisma.soumission.update({
      where: { id: req.params.id },
      data: { noteTechnique, noteFinanciere, noteGlobale, classement, commentairesEvaluation, statut: "EN_EVALUATION" },
    });
    res.json({ soumission: s });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /soumissions/:id/retain — attribuer le marche
app.patch("/soumissions/:id/retain", auth, requireRole("DIRECTEUR"), async (req, res) => {
  try {
    const s = await prisma.soumission.findUnique({ where: { id: req.params.id }, include: { appelOffre: true, fournisseur: true } });
    if (!s) return res.status(404).json({ error: "Not found" });

    await prisma.$transaction([
      prisma.soumission.update({ where: { id: req.params.id }, data: { statut: "RETENUE" } }),
      prisma.appelOffre.update({ where: { id: s.appelOffreId }, data: { statut: "ATTRIBUE", dateAttribution: new Date() } }),
      prisma.soumission.updateMany({ where: { appelOffreId: s.appelOffreId, id: { not: req.params.id } }, data: { statut: "REJETEE" } }),
      prisma.appelOffreResultat.upsert({
        where: { appelOffreId: s.appelOffreId },
        update: { soumissionRetenueId: req.params.id, fournisseurRetenuNom: s.fournisseur.raisonSociale, montantAttribue: s.offreFinanciere, publieAt: new Date(), publiePar: req.user.id },
        create: { appelOffreId: s.appelOffreId, soumissionRetenueId: req.params.id, fournisseurRetenuNom: s.fournisseur.raisonSociale, montantAttribue: s.offreFinanciere, publieAt: new Date(), publiePar: req.user.id },
      }),
    ]);

    await publishEvent("tender.attributed", { id: s.appelOffreId, fournisseurNom: s.fournisseur.raisonSociale, montant: s.offreFinanciere });
    res.json({ message: "Marche attribue" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// DOCUMENTS (gestion fluide)
// ============================================================

// GET /documents — liste avec filtres + visibilité
app.get("/documents", auth, async (req, res) => {
  try {
    const { appelOffreId, soumissionId, fournisseurId, projetId, type, category, visibility, q, isPinned, page = "1", limit = "50" } = req.query;
    const where = {};
    if (appelOffreId) where.appelOffreId = appelOffreId;
    if (soumissionId) where.soumissionId = soumissionId;
    if (fournisseurId) where.fournisseurId = fournisseurId;
    if (projetId) where.projetId = projetId;
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
      appelOffreId: req.body?.appelOffreId || null,
      soumissionId: req.body?.soumissionId || null,
      fournisseurId: req.body?.fournisseurId || null,
      projetId: req.body?.projetId || null,
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
// ANALYTICS
// ============================================================

// GET /analytics
app.get("/analytics", auth, async (req, res) => {
  try {
    const [totalAO, actifs, attribues, totalSoumissions, totalFournisseurs, verifies, budgetTotal, budgetAttribue] = await Promise.all([
      prisma.appelOffre.count(),
      prisma.appelOffre.count({ where: { statut: { in: ["PUBLIE", "EN_COURS"] } } }),
      prisma.appelOffre.count({ where: { statut: "ATTRIBUE" } }),
      prisma.soumission.count(),
      prisma.fournisseur.count(),
      prisma.fournisseur.count({ where: { statut: "VERIFIE" } }),
      prisma.appelOffre.aggregate({ _sum: { budgetEstime: true } }),
      prisma.appelOffreResultat.aggregate({ _sum: { montantAttribue: true } }),
    ]);

    const [byCategorie, byStatut, topBailleurs] = await Promise.all([
      prisma.appelOffre.groupBy({ by: ["categorie"], _count: { id: true } }),
      prisma.appelOffre.groupBy({ by: ["statut"], _count: { id: true } }),
      prisma.appelOffre.groupBy({ by: ["bailleurId"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
    ]);

    const bailleurs = await prisma.bailleur.findMany({ where: { id: { in: topBailleurs.map(b => b.bailleurId) } } });
    const bailleurMap = new Map(bailleurs.map(b => [b.id, b]));

    res.json({
      kpis: {
        totalAO, actifs, attribues,
        tauxAttribution: totalAO > 0 ? Math.round((attribues / totalAO) * 100) : 0,
        totalSoumissions, totalFournisseurs, verifies,
        budgetTotal: budgetTotal._sum.budgetEstime ?? 0,
        budgetAttribue: budgetAttribue._sum.montantAttribue ?? 0,
      },
      byCategorie, byStatut,
      topBailleurs: topBailleurs.map(b => ({ ...b, bailleur: bailleurMap.get(b.bailleurId) })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    // Renvoyer en format clé-valeur pour faciliter l'usage côté UI
    const asMap = {};
    for (const s of settings) asMap[s.key] = s.value;
    res.json({ settings, map: asMap });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /settings/:key — valeur d'une clé spécifique
app.get("/settings/:key", auth, async (req, res) => {
  try {
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

app.listen(PORT, () => console.log(`Tender service running on port ${PORT}`));
