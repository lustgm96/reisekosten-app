import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { redirect } from "next/navigation";

export default async function NewReport(){
  async function create(fd:FormData){"use server";const user=await requireUser();const p=reportSchema.parse(Object.fromEntries(fd));const report=await db.expenseReport.create({data:{employeeId:user.id,...p,status:"DRAFT"}});redirect(`/reports/${report.id}`)}
  return <><h1>Neue Abrechnung</h1><div className="sub">Schritt 1 von 2: Reisedaten erfassen</div><div className="card" style={{maxWidth:850}}><form action={create}>
    <div><label>Titel</label><input name="title" placeholder="z. B. Kundenbesuch Hamburg" required/></div>
    <div><label>Reisezweck</label><textarea name="purpose" required/></div>
    <div><label>Zielort</label><input name="destination" required/></div>
    <div className="row"><div><label>Beginn</label><input name="startAt" type="datetime-local" required/></div><div><label>Ende</label><input name="endAt" type="datetime-local" required/></div></div>
    <div className="row"><div><label>Verkehrsmittel</label><select name="transportType"><option>Firmenwagen</option><option>Privat-Pkw</option><option>Bahn</option><option>Flug</option><option>Sonstiges</option></select></div><div><label>Privat gefahrene Kilometer</label><input name="privateKilometers" type="number" min="0" step="1" defaultValue="0"/></div></div>
    <div className="row3"><div><label>Frühstücke</label><input name="breakfasts" type="number" min="0" defaultValue="0"/></div><div><label>Mittagessen</label><input name="lunches" type="number" min="0" defaultValue="0"/></div><div><label>Abendessen</label><input name="dinners" type="number" min="0" defaultValue="0"/></div></div>
    <button>Speichern und Belege hinzufügen</button>
  </form></div></>
}
