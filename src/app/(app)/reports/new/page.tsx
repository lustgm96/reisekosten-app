import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { redirect } from "next/navigation";
import { getPerDiemRates } from "@/lib/settings";
import { countryOptions, resolvePerDiemRate } from "@/lib/per-diem";
import { nextProcessNumber } from "@/lib/process-number";
import { TransportFields } from "../transport-fields";

export default async function NewReport(){
  async function create(fd:FormData){"use server";const user=await requireUser();const p=reportSchema.parse(Object.fromEntries(fd));const rate=resolvePerDiemRate(p.countryCode,p.destination,await getPerDiemRates());const report=await db.$transaction(async tx=>{const processNumber=await nextProcessNumber(tx);return tx.expenseReport.create({data:{employeeId:user.id,processNumber,...p,perDiemCode:rate.code,perDiemFullDay:rate.fullDay,perDiemPartialDay:rate.partialDay,perDiemOvernight:rate.overnight,status:"DRAFT"}})});redirect(`/reports/${report.id}`)}
  return <><h1>Neue Abrechnung</h1><div className="sub">Schritt 1 von 2: Reisedaten erfassen</div><div className="card" style={{maxWidth:850}}><form action={create}>
    <div><label>Titel</label><input name="title" placeholder="z. B. Kundenbesuch Hamburg" required/></div>
    <div><label>Reisezweck</label><textarea name="purpose" required/></div>
    <div className="row"><div><label>Reiseland</label><select name="countryCode" defaultValue="DE">{countryOptions.map(country=><option key={country.code} value={country.code}>{country.label}</option>)}</select></div><div><label>Zielort</label><input name="destination" placeholder="z. B. Dublin, Mumbai oder Madrid" required/></div></div>
    <div><label>Übernachtung abrechnen</label><select name="accommodationMode" defaultValue="ACTUAL"><option value="ACTUAL">Tatsächliche Hotelkosten laut Beleg</option><option value="PER_DIEM">Übernachtungspauschale ohne Hotelbeleg</option><option value="PROVIDED">Vom Arbeitgeber gestellt / keine Erstattung</option></select></div>
    <div className="row"><div><label>Beginn</label><input name="startAt" type="datetime-local" required/></div><div><label>Ende</label><input name="endAt" type="datetime-local" required/></div></div>
    <TransportFields/>
    <button>Speichern und Belege hinzufügen</button>
  </form></div></>
}
