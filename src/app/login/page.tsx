import { login } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const params=await searchParams;
  async function action(fd:FormData){"use server";if(!await login(String(fd.get("email")),String(fd.get("password"))))redirect("/login?error=1");redirect("/")}
  return <main className="login"><div className="card"><h1>Reisekosten</h1><p className="sub">Digitale Abrechnung für das Team</p><form action={action}>
    <div><label>E-Mail</label><input name="email" type="email" defaultValue="mitarbeiter@example.local" required/></div>
    <div><label>Passwort</label><input name="password" type="password" defaultValue="dev1234!" required/></div>
    {params.error&&<div className="error">Anmeldung fehlgeschlagen.</div>}
    <button>Anmelden</button>
  </form><p className="small login-link"><a href="/register">Noch kein Zugang? Jetzt registrieren</a></p></div></main>
}
