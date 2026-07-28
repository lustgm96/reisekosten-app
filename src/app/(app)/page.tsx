import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic="force-dynamic";

export default async function Dashboard(){
  const user=await requireUser();
  const where=user.role==="EMPLOYEE"?{employeeId:user.id}:{};
  const reports=await db.expenseReport.findMany({where,include:{employee:true,expenses:true},orderBy:{updatedAt:"desc"}});
  return <><h1>Dashboard</h1><div className="sub">Alles Wichtige auf einen Blick</div>
  <section className="grid kpis">
    <div className="card"><div className="label">Entwürfe</div><div className="value">{reports.filter(x=>x.status==="DRAFT"||x.status==="RETURNED").length}</div></div>
    <div className="card"><div className="label">In Prüfung</div><div className="value">{reports.filter(x=>x.status==="SUBMITTED").length}</div></div>
    <div className="card"><div className="label">Freigegeben</div><div className="value">{reports.filter(x=>x.status==="APPROVED").length}</div></div>
    <div className="card"><div className="label">Abgeschlossen</div><div className="value">{reports.filter(x=>x.status==="COMPLETED").length}</div></div>
  </section>
  <div className="actions" style={{marginTop:16}}><Link className="button" href="/reports/new">Neue Abrechnung</Link></div>
  <div className="card" style={{marginTop:16}}><h2>Letzte Abrechnungen</h2><table><thead><tr><th>Mitarbeiter</th><th>Titel</th><th>Zeitraum</th><th>Belege</th><th>Status</th><th></th></tr></thead><tbody>
  {reports.map(r=><tr key={r.id}><td>{r.employee.name}</td><td>{r.title}</td><td>{r.startAt.toLocaleDateString("de-DE")} – {r.endAt.toLocaleDateString("de-DE")}</td><td>{r.expenses.length}</td><td><span className="badge">{r.status}</span></td><td><Link href={`/reports/${r.id}`}>Öffnen</Link></td></tr>)}
  </tbody></table></div></>
}
