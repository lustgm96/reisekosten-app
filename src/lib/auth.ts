import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

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
    path: "/",
    maxAge: 43200
  });
  return true;
}

export async function logout() {
  (await cookies()).delete(cookieName);
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
