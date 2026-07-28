import { logout, requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navigation } from "./navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  async function signOut() {
    "use server";
    await logout();
    redirect("/login");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Reisekosten</div>
        <Navigation role={user.role} />
        <div className="user">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role}</span>
          <form action={signOut}>
            <button className="secondary sign-out">Abmelden</button>
          </form>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
