import { register } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  async function action(fd: FormData) {
    "use server";
    const name = String(fd.get("name") ?? "");
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const passwordConfirmation = String(fd.get("passwordConfirmation") ?? "");
    if (password !== passwordConfirmation) redirect("/register?error=password");
    const result = await register(name, email, password);
    if (result === "exists") redirect("/register?error=exists");
    if (result === "invalid") redirect("/register?error=invalid");
    redirect("/");
  }

  return <main className="login"><div className="card"><h1>Zugang anlegen</h1><p className="sub">Registriere dich für die digitale Reisekostenabrechnung.</p><form action={action}>
    <div><label htmlFor="name">Name</label><input id="name" name="name" type="text" autoComplete="name" required /></div>
    <div><label htmlFor="email">E-Mail</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
    <div><label htmlFor="password">Passwort</label><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /><span className="small">Mindestens 8 Zeichen.</span></div>
    <div><label htmlFor="passwordConfirmation">Passwort wiederholen</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" required /></div>
    {params.error === "exists" && <div className="error">Für diese E-Mail-Adresse existiert bereits ein Zugang.</div>}
    {params.error === "password" && <div className="error">Die Passwörter stimmen nicht überein.</div>}
    {params.error === "invalid" && <div className="error">Bitte Name, E-Mail und ein gültiges Passwort prüfen.</div>}
    <button>Registrieren</button>
  </form><p className="small login-link"><a href="/login">Bereits registriert? Anmelden</a></p></div></main>;
}
