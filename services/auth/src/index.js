const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("./generated/prisma");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "chadia-secret";

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_, res) => res.json({ status: "ok", service: "auth" }));

// Middleware: verify JWT
function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Middleware: verify service-to-service token
// Accepts env-based shared secret (INTERNAL_SERVICE_TOKEN) for dev/simple deploys,
// falls back to DB-stored ServiceToken for rotated tokens.
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
async function serviceAuth(req, res, next) {
  const token = req.headers["x-service-token"];
  if (!token) return res.status(401).json({ error: "Missing service token" });
  if (INTERNAL_SERVICE_TOKEN && token === INTERNAL_SERVICE_TOKEN) {
    req.serviceScopes = ["*"];
    return next();
  }
  const svc = await prisma.serviceToken.findUnique({ where: { token } });
  if (!svc || !svc.isActive) return res.status(401).json({ error: "Invalid service token" });
  req.serviceScopes = svc.scopes;
  next();
}

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  try {
    const { email, name, password, role = "MEMBRE" } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: "Missing fields" });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already exists" });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, name, passwordHash, role } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", ip: req.ip, userAgent: req.headers["user-agent"] } });
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /auth/me
app.get("/auth/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, name: true, role: true, image: true } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// GET /auth/users — list users (admin) ou ?email=... pour lookup (service-to-service)
app.get("/auth/users", async (req, res) => {
  // Lookup par email — autorisé pour les services internes (s2s token)
  if (req.query.email) {
    const svcToken = req.headers["x-service-token"];
    if (!svcToken) return res.status(401).json({ error: "Service token required for email lookup" });
    // Accepte soit un token global INTERNAL_SERVICE_TOKEN, soit un token
    // par service en base (table service_tokens).
    const isGlobal = process.env.INTERNAL_SERVICE_TOKEN && svcToken === process.env.INTERNAL_SERVICE_TOKEN;
    if (!isGlobal) {
      const svc = await prisma.serviceToken.findUnique({ where: { token: svcToken } });
      if (!svc || !svc.isActive) return res.status(401).json({ error: "Invalid service token" });
    }
    const user = await prisma.user.findUnique({
      where: { email: String(req.query.email) },
      select: { id: true, email: true, name: true, role: true, image: true, googleId: true, isActive: true },
    });
    return res.json({ user });
  }

  // Sinon liste — réservée admin/directeur
  return auth(req, res, async () => {
    if (req.user.role !== "ADMIN" && req.user.role !== "DIRECTEUR") return res.status(403).json({ error: "Forbidden" });
    // Filtres optionnels : instance (CA, BUREAU…), zone, q
    const { instance, zone, q, active } = req.query;
    const where = {};
    if (instance) where.instance = instance;
    if (zone) where.zone = { contains: zone, mode: "insensitive" };
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { fonction: { contains: q, mode: "insensitive" } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        fonction: true, zone: true, telephone: true, instance: true,
        bio: true, image: true, dateEmbauche: true, createdAt: true,
      },
      orderBy: [{ instance: "asc" }, { name: "asc" }],
    });
    res.json({ users });
  });
});

// POST /auth/users — crée un utilisateur depuis l'admin (admin/directeur)
// Différent de /auth/register : ce dernier permet l'auto-inscription
// publique (cas légacy). Ici on crée pour un autre user en tant qu'admin.
// Si le mot de passe n'est pas fourni, on en génère un aléatoire et on le
// renvoie dans la réponse (l'admin a la responsabilité de le transmettre
// au nouveau membre — l'envoi par email viendra avec resend).
app.post("/auth/users", auth, async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "DIRECTEUR") {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const { email, name, role = "MEMBRE", password, fonction, zone, telephone, instance } = req.body;
    if (!email || !name) return res.status(400).json({ error: "email et name requis" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email déjà utilisé" });

    // Mot de passe : fourni par l'admin, sinon généré (8 octets b64url ~= 11 chars)
    const generated = !password;
    const finalPassword = password || require("crypto").randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(finalPassword, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        fonction: fonction || null,
        zone: zone || null,
        telephone: telephone || null,
        instance: instance || null,
      },
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        fonction: true, zone: true, telephone: true, instance: true, createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.id, action: "USER_CREATE", resource: user.id, details: { email, role } },
    });

    res.status(201).json({
      user,
      // Si on a généré le mot de passe, on le renvoie UNE SEULE FOIS pour
      // que l'admin puisse le communiquer au nouveau membre.
      generatedPassword: generated ? finalPassword : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /auth/users/:id — update (admin/directeur)
app.patch("/auth/users/:id", auth, async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "DIRECTEUR") return res.status(403).json({ error: "Forbidden" });
  const { name, role, isActive, image } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (image !== undefined) data.image = image;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: "USER_UPDATE", resource: req.params.id, details: data } });
    res.json({ user });
  } catch (e) {
    res.status(404).json({ error: "User not found" });
  }
});

// DELETE /auth/users/:id — soft delete (directeur seulement)
app.delete("/auth/users/:id", auth, async (req, res) => {
  if (req.user.role !== "DIRECTEUR") return res.status(403).json({ error: "Forbidden" });
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Cannot delete self" });
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await prisma.auditLog.create({ data: { userId: req.user.id, action: "USER_DEACTIVATE", resource: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

// POST /auth/oauth/google — upsert/link user après login Google côté gateway
// Service-to-service: appelé par le gateway dans le callback NextAuth signIn
app.post("/auth/oauth/google", serviceAuth, async (req, res) => {
  try {
    const { email, name, image, providerAccountId } = req.body;
    if (!email || !providerAccountId) return res.status(400).json({ error: "Missing email or providerAccountId" });

    const existing = await prisma.user.findUnique({ where: { email } });
    // Politique: seuls les utilisateurs déjà inscrits peuvent se connecter via Google
    if (!existing) return res.status(404).json({ error: "User not registered" });
    if (!existing.isActive) return res.status(403).json({ error: "User inactive" });

    let user = existing;
    if (!existing.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId: providerAccountId, image: image || existing.image, name: name || existing.name },
      });
    }

    await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN_GOOGLE" } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /auth/service-token — create service-to-service token
app.post("/auth/service-token", auth, async (req, res) => {
  if (req.user.role !== "DIRECTEUR") return res.status(403).json({ error: "Forbidden" });
  const { serviceName, scopes = [] } = req.body;
  const token = require("crypto").randomBytes(32).toString("hex");
  const svc = await prisma.serviceToken.create({ data: { serviceName, token, scopes } });
  res.status(201).json({ serviceToken: svc });
});

// GET /auth/validate — validate token (called by other services)
app.get("/auth/validate", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ valid: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.json({ valid: false });
  }
});

app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
