import Link from "next/link";
import { logout, requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({children}:{children:React.ReactNode}) {
  const user=await requireUser();
  async function signOut(){"use server";await logout();redirect("/login")}
  return <div className="app"><aside className="sidebar"><div className="brand">Reisekosten</div><nav className="nav">
    <Link href="/">Dashboard</Link><Link href="/reports/new">Neue Abrechnung</Link><Link href="/archive">Archiv</Link>
    {user.role!=="EMPLOYEE"&&<Link href="/review">Prüfung</Link>}
    {user.role==="ADMIN"&&<Link href="/settings">Einstellungen</Link>}
  </nav><div className="user">{user.name}<br/>{user.role}<form action={signOut}><button className="secondary" style={{marginTop:8}}>Abmelden</button></form></div></aside><main>{children}</main></div>
}
