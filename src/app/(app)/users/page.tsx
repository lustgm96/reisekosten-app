import bcrypt from "bcryptjs";
import { Prisma, type Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema, userSchema } from "@/lib/validation";
import { getAdminChangeError } from "@/lib/user-policy";
import "./users.css";

export const dynamic = "force-dynamic";

const roleLabels: Record<Role, string> = {
  EMPLOYEE: "Mitarbeiter",
  APPROVER: "Prüfer",
  ADMIN: "Admin"
};

const feedbackUrl = (kind: "success" | "error", message: string) =>
  `/users?${kind}=${encodeURIComponent(message)}`;

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export default async function UsersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const actor = await requireAdmin();
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const feedback = await searchParams;

  async function createUser(formData: FormData) {
    "use server";
    await requireAdmin();
    const parsedUser = userSchema.safeParse(Object.fromEntries(formData));
    const parsedPassword = passwordSchema.safeParse(Object.fromEntries(formData));
    if (!parsedUser.success || !parsedPassword.success) {
      redirect(feedbackUrl("error", "Bitte alle Angaben prüfen. Das Passwort benötigt mindestens 8 Zeichen."));
    }
    try {
      await db.user.create({
        data: {
          ...parsedUser.data,
          passwordHash: await bcrypt.hash(parsedPassword.data.password, 12)
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        redirect(feedbackUrl("error", "Diese E-Mail-Adresse wird bereits verwendet."));
      }
      throw error;
    }
    revalidatePath("/users");
    redirect(feedbackUrl("success", "Benutzer wurde angelegt."));
  }

  async function updateUser(formData: FormData) {
    "use server";
    const currentAdmin = await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const parsed = userSchema.safeParse(Object.fromEntries(formData));
    if (!id || !parsed.success) redirect(feedbackUrl("error", "Die Benutzerdaten sind ungültig."));

    const target = await db.user.findUnique({ where: { id } });
    if (!target) redirect(feedbackUrl("error", "Der Benutzer wurde nicht gefunden."));
    const active = formData.get("active") === "on";

    const activeAdminCount = await db.user.count({ where: { role: "ADMIN", active: true } });
    const policyError = getAdminChangeError({
      activeAdminCount,
      actorId: currentAdmin.id,
      nextActive: active,
      nextRole: parsed.data.role,
      targetActive: target.active,
      targetId: target.id,
      targetRole: target.role
    });
    if (policyError) redirect(feedbackUrl("error", policyError));

    try {
      await db.user.update({ where: { id }, data: { ...parsed.data, active } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        redirect(feedbackUrl("error", "Diese E-Mail-Adresse wird bereits verwendet."));
      }
      throw error;
    }
    revalidatePath("/users");
    redirect(feedbackUrl("success", "Benutzer wurde aktualisiert."));
  }

  async function resetPassword(formData: FormData) {
    "use server";
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
    if (!id || !parsed.success) {
      redirect(feedbackUrl("error", "Das neue Passwort benötigt mindestens 8 Zeichen."));
    }
    await db.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) }
    });
    redirect(feedbackUrl("success", "Passwort wurde neu gesetzt."));
  }

  return (
    <>
      <h1>Benutzer</h1>
      <div className="sub">Zugänge und Rollen für das Team verwalten</div>

      {feedback.error && <div className="callout error-callout">{feedback.error}</div>}
      {feedback.success && <div className="callout success-callout">{feedback.success}</div>}

      <div className="card user-create">
        <h2>Benutzer anlegen</h2>
        <form action={createUser}>
          <div className="row3">
            <div>
              <label htmlFor="new-name">Name</label>
              <input id="new-name" name="name" minLength={2} maxLength={120} required />
            </div>
            <div>
              <label htmlFor="new-email">E-Mail</label>
              <input id="new-email" name="email" type="email" maxLength={200} required />
            </div>
            <div>
              <label htmlFor="new-role">Rolle</label>
              <select id="new-role" name="role" defaultValue="EMPLOYEE">
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="user-password-field">
            <label htmlFor="new-password">Startpasswort</label>
            <input id="new-password" name="password" type="password" minLength={8} maxLength={100} required />
          </div>
          <div className="actions"><button>Benutzer anlegen</button></div>
        </form>
      </div>

      <div className="user-list">
        {users.map(user => {
          const isCurrentUser = user.id === actor.id;
          return (
            <section className={`card user-card${user.active ? "" : " user-inactive"}`} key={user.id}>
              <div className="user-card-heading">
                <div>
                  <h2>{user.name}</h2>
                  <span className={`badge ${user.active ? "ok" : "bad"}`}>
                    {user.active ? "Aktiv" : "Deaktiviert"}
                  </span>
                  {isCurrentUser && <span className="badge">Eigener Zugang</span>}
                </div>
                <span className="small">Angelegt am {user.createdAt.toLocaleDateString("de-DE")}</span>
              </div>

              <form action={updateUser}>
                <input type="hidden" name="id" value={user.id} />
                {isCurrentUser && <input type="hidden" name="active" value="on" />}
                <div className="row3">
                  <div>
                    <label htmlFor={`name-${user.id}`}>Name</label>
                    <input id={`name-${user.id}`} name="name" defaultValue={user.name} minLength={2} maxLength={120} required />
                  </div>
                  <div>
                    <label htmlFor={`email-${user.id}`}>E-Mail</label>
                    <input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email} maxLength={200} required />
                  </div>
                  <div>
                    <label htmlFor={`role-${user.id}`}>Rolle</label>
                    <select id={`role-${user.id}`} name="role" defaultValue={user.role} disabled={isCurrentUser}>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {isCurrentUser && <input type="hidden" name="role" value="ADMIN" />}
                  </div>
                </div>
                <label className="checkbox">
                  <input name="active" type="checkbox" defaultChecked={user.active} disabled={isCurrentUser} />
                  Zugang aktiv
                </label>
                <div className="actions"><button>Änderungen speichern</button></div>
              </form>

              <form action={resetPassword} className="password-reset">
                <input type="hidden" name="id" value={user.id} />
                <div>
                  <label htmlFor={`password-${user.id}`}>Neues Passwort</label>
                  <input id={`password-${user.id}`} name="password" type="password" minLength={8} maxLength={100} required />
                </div>
                <button className="secondary">Passwort setzen</button>
              </form>
            </section>
          );
        })}
      </div>
    </>
  );
}
