import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic="force-dynamic";

export default async function ReviewPage(){
  const user=await requireUser();
  if(user.role==="EMPLOYEE")redirect("/");
  const reports=await db.expenseReport.findMany({
    where:{status:"SUBMITTED"},
    include:{employee:true,expenses:true},
    orderBy:{submittedAt:"asc"}
  });

  return <><h1>Prüfung</h1><div className="sub">Zur Freigabe eingereichte Abrechnungen</div>
  <div className="card"><table><thead><tr><th>Mitarbeiter</th><th>Abrechnung</th><th>Zeitraum</th><th>Belege</th><th></th></tr></thead><tbody>
  {reports.map(r=><tr key={r.id}><td>{r.employee.name}</td><td>{r.title}</td><td>{r.startAt.toLocaleDateString("de-DE")} – {r.endAt.toLocaleDateString("de-DE")}</td><td>{r.expenses.length}</td><td><Link href={`/review/${r.id}`}>Prüfen</Link></td></tr>)}
  </tbody></table>{reports.length===0&&<p className="small">Aktuell liegt nichts zur Prüfung vor.</p>}</div></>
}
