const { PrismaClient } = require("../src/generated/prisma");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@chadia.org";
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";
  const hash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "DIRECTEUR" },
    create: { email, name: "Directeur CHADIA", passwordHash: hash, role: "DIRECTEUR" },
  });
  console.log(`Admin user created: ${email}`);

  // Create service tokens for inter-service communication
  const crypto = require("crypto");
  const services = [
    { name: "tender-service", scopes: ["tender:read", "tender:write"] },
    { name: "notification-service", scopes: ["notification:send"] },
    { name: "gateway", scopes: ["auth:read", "tender:read", "tender:write", "notification:read"] },
  ];
  for (const svc of services) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.serviceToken.upsert({
      where: { serviceName: svc.name },
      update: {},
      create: { serviceName: svc.name, token, scopes: svc.scopes },
    });
    console.log(`Service token for ${svc.name}: ${token}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
