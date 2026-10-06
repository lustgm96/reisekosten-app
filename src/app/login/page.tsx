import { isSelfRegistrationEnabled, login } from "@/lib/auth";
import { ThemeToggle } from "../theme-toggle";
import { redirect } from "next/navigation";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const params=await searchParams;
  const isDev=process.env.NODE_ENV!=="production";
  async function action(fd:FormData){"use server";if(!await login(String(fd.get("email")),String(fd.get("password"))))redirect("/login?error=1");redirect("/")}
  return <main className="login"><ThemeToggle floating /><div className="card"><h1>Reisekosten</h1><p className="sub">Digitale Abrechnung für das Team</p><form action={action}>
    <div><label>E-Mail</label><input name="email" type="email" defaultValue={isDev?"mitarbeiter@example.local":undefined} required/></div>
    <div><label>Passwort</label><input name="password" type="password" defaultValue={isDev?"dev1234!":undefined} required/></div>
    {params.error&&<div className="error">Anmeldung fehlgeschlagen.</div>}
    <button>Anmelden</button>
  </form>{isSelfRegistrationEnabled()&&<p className="small login-link"><a href="/register">Noch kein Zugang? Jetzt registrieren</a></p>}</div></main>
}
