const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3002;

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

// GET /documents
app.get("/documents", auth, async (req, res) => {
  try {
    const { appelOffreId, soumissionId, fournisseurId, type, page = "1", limit = "20" } = req.query;
    const where = {};
    if (appelOffreId) where.appelOffreId = appelOffreId;
    if (soumissionId) where.soumissionId = soumissionId;
    if (fournisseurId) where.fournisseurId = fournisseurId;
    if (type) where.type = type;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [documents, total] = await Promise.all([
      prisma.document.findMany({ where, orderBy: { createdAt: "desc" }, skip: (pageNum - 1) * limitNum, take: limitNum }),
      prisma.document.count({ where }),
    ]);
    res.json({ documents, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /documents — enregistrer un document (upload via le gateway)
app.post("/documents", auth, async (req, res) => {
  try {
    const body = req.body;
    if (!body.nom || !body.url || !body.type) return res.status(400).json({ error: "nom, url, type required" });
    const doc = await prisma.document.create({
      data: { ...body, uploadedBy: req.user.id },
    });
    res.status(201).json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /documents/:id
app.get("/documents/:id", auth, async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /documents/:id
app.delete("/documents/:id", auth, async (req, res) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
