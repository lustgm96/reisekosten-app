// Legt (oder aktualisiert) den ersten Admin an: ADMIN_EMAIL, ADMIN_PASSWORD, optional ADMIN_NAME.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 8) {
  throw new Error("ADMIN_EMAIL und ADMIN_PASSWORD (mind. 8 Zeichen) setzen.");
}

const db = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 12);
await db.user.upsert({
  where: { email },
  update: { passwordHash, role: "ADMIN", active: true },
  create: { email, passwordHash, name: process.env.ADMIN_NAME || "Administration", role: "ADMIN" }
});
await db.$disconnect();
console.log(`Admin ${email} angelegt/aktualisiert.`);
