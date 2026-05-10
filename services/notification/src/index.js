const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok", service: "notification" }));

// Middleware: service auth
async function serviceAuth(req, res, next) {
  const token = req.headers["x-service-token"];
  if (!token) return res.status(401).json({ error: "Missing service token" });
  // In production, validate against auth service
  next();
}

// ============================================================
// NOTIFICATIONS
// ============================================================

// GET /notifications?userId=xxx
app.get("/notifications", async (req, res) => {
  try {
    const { userId, lu, page = "1", limit = "20" } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (lu !== undefined) where.lu = lu === "true";

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (pageNum - 1) * limitNum, take: limitNum }),
      prisma.notification.count({ where }),
    ]);
    res.json({ notifications, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /notifications
app.post("/notifications", serviceAuth, async (req, res) => {
  try {
    const { userId, type, titre, message, lien, metadata } = req.body;
    if (!userId || !type || !titre) return res.status(400).json({ error: "userId, type, titre required" });
    const notif = await prisma.notification.create({ data: { userId, type, titre, message, lien, metadata } });
    res.status(201).json({ notification: notif });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /notifications/bulk — notifier plusieurs users
app.post("/notifications/bulk", serviceAuth, async (req, res) => {
  try {
    const { userIds, type, titre, message, lien, metadata } = req.body;
    if (!userIds?.length || !type || !titre) return res.status(400).json({ error: "userIds, type, titre required" });
    const data = userIds.map(userId => ({ userId, type, titre, message, lien, metadata }));
    await prisma.notification.createMany({ data });
    res.status(201).json({ count: userIds.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /notifications/:id/read
app.patch("/notifications/:id/read", async (req, res) => {
  try {
    const n = await prisma.notification.update({ where: { id: req.params.id }, data: { lu: true } });
    res.json({ notification: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /notifications/read-all?userId=xxx
app.patch("/notifications/read-all", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await prisma.notification.updateMany({ where: { userId, lu: false }, data: { lu: true } });
    res.json({ message: "All marked as read" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ALERTES
// ============================================================

// GET /alertes?userId=xxx
app.get("/alertes", async (req, res) => {
  try {
    const { userId } = req.query;
    const where = userId ? { userId } : {};
    const alertes = await prisma.alerte.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ alertes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /alertes
app.post("/alertes", serviceAuth, async (req, res) => {
  try {
    const alerte = await prisma.alerte.create({ data: req.body });
    res.status(201).json({ alerte });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ABONNEMENTS
// ============================================================

// GET /abonnements?userId=xxx
app.get("/abonnements", async (req, res) => {
  try {
    const { userId } = req.query;
    const where = userId ? { userId } : {};
    const abonnements = await prisma.abonnement.findMany({ where });
    res.json({ abonnements });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /abonnements
app.post("/abonnements", async (req, res) => {
  try {
    const { userId, typeFiltre, valeurFiltre } = req.body;
    if (!userId || !typeFiltre || !valeurFiltre) return res.status(400).json({ error: "Missing fields" });
    const abo = await prisma.abonnement.upsert({
      where: { userId_typeFiltre_valeurFiltre: { userId, typeFiltre, valeurFiltre } },
      update: { actif: true },
      create: { userId, typeFiltre, valeurFiltre },
    });
    res.status(201).json({ abonnement: abo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /abonnements/:id
app.delete("/abonnements/:id", async (req, res) => {
  try {
    await prisma.abonnement.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// EMAIL (via Resend)
// ============================================================

// POST /email/send
app.post("/email/send", serviceAuth, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject) return res.status(400).json({ error: "to and subject required" });

    const resendKey = process.env.RESEND_API_KEY;
    let status = "queued";
    let error = null;

    if (resendKey) {
      try {
        const { Resend } = require("resend");
        const resend = new Resend(resendKey);
        await resend.emails.send({ from: "CHADIA <noreply@chadia.org>", to, subject, html, text });
        status = "sent";
      } catch (e) {
        status = "failed";
        error = e.message;
      }
    }

    await prisma.emailLog.create({ data: { to, subject, body: html || text, status, error } });
    res.json({ status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Notification service running on port ${PORT}`));
