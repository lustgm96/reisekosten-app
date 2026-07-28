import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "../status-badge";

export const dynamic="force-dynamic";

export default async function Archive(){
  const user=await requireUser();
  const reports=await db.expenseReport.findMany({
    where:{
      ...(user.role==="EMPLOYEE"?{employeeId:user.id}:{}),
      status:{in:["APPROVED","COMPLETED"]}
    },
    include:{employee:true},
    orderBy:{updatedAt:"desc"}
  });

  return <><h1>Archiv</h1><div className="sub">Freigegebene und abgeschlossene Abrechnungen</div>
  <div className="card"><table><thead><tr><th>Mitarbeiter</th><th>Titel</th><th>Zeitraum</th><th>Status</th><th>Dokumente</th></tr></thead><tbody>
  {reports.map(r=><tr key={r.id}><td>{r.employee.name}</td><td>{r.title}</td><td>{r.startAt.toLocaleDateString("de-DE")} – {r.endAt.toLocaleDateString("de-DE")}</td><td><StatusBadge status={r.status}/></td><td><Link href={`/reports/${r.id}`}>Öffnen</Link> · <a href={`/api/reports/${r.id}/pdf`}>PDF</a></td></tr>)}
  </tbody></table>{reports.length===0&&<p className="small">Noch keine archivierten Abrechnungen.</p>}</div></>
}
