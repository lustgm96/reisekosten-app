import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { basePath } from "./paths";
import { passwordSchema } from "./validation";

const cookieName = "reisekosten_session";
const key = new TextEncoder().encode(
  process.env.AUTH_SECRET || "lokaler-entwicklungs-schluessel-bitte-ersetzen"
);

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) return false;

  const token = await new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: basePath || "/",
    maxAge: 43200
  });
  return true;
}

export async function register(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const parsedPassword = passwordSchema.safeParse({ password });
  if (!name.trim() || !normalizedEmail || !parsedPassword.success) return "invalid" as const;

  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) return "exists" as const;

  const passwordHash = await bcrypt.hash(parsedPassword.data.password, 12);
  const user = await db.user.create({
    data: { name: name.trim(), email: normalizedEmail, passwordHash, role: "EMPLOYEE" }
  });

  await login(normalizedEmail, parsedPassword.data.password);
  return user;
}

export async function logout() {
  (await cookies()).set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: basePath || "/",
    maxAge: 0
  });
}

export async function currentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    return user?.active ? user : null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
