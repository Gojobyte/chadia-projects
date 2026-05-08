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
async function serviceAuth(req, res, next) {
  const token = req.headers["x-service-token"];
  if (!token) return res.status(401).json({ error: "Missing service token" });
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

// GET /auth/users — list users (admin)
app.get("/auth/users", auth, async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "DIRECTEUR") return res.status(403).json({ error: "Forbidden" });
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  res.json({ users });
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
