import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { redirect } from "next/navigation";
import { getPerDiemRates } from "@/lib/settings";
import { resolvePerDiemRate } from "@/lib/per-diem";
import { nextProcessNumber } from "@/lib/process-number";
import { ReportFields } from "../report-fields";

export default async function NewReport(){
  async function create(fd:FormData){"use server";const user=await requireUser();const p=reportSchema.parse(Object.fromEntries(fd));const rate=resolvePerDiemRate(p.countryCode,p.destination,await getPerDiemRates());const report=await db.$transaction(async tx=>{const processNumber=await nextProcessNumber(tx);return tx.expenseReport.create({data:{employeeId:user.id,processNumber,...p,perDiemCode:rate.code,perDiemFullDay:rate.fullDay,perDiemPartialDay:rate.partialDay,perDiemOvernight:rate.overnight,status:"DRAFT"}})});redirect(`/reports/${report.id}`)}
  return <><h1>Neue Abrechnung</h1><div className="sub">Schritt 1 von 2: Reisedaten erfassen</div><div className="card" style={{maxWidth:850}}><form action={create}>
    <ReportFields/>
    <button>Speichern und Belege hinzufügen</button>
  </form></div></>
}
