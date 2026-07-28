import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenseSchema, commentSchema } from "@/lib/validation";
import { removeStoredFiles, storeUpload } from "@/lib/storage";
import { getNumericSettings } from "@/lib/settings";
import { calculateReport } from "@/lib/calculation";
import { ConfirmDeleteButton } from "./confirm-delete-button";

export const dynamic="force-dynamic";
const eur=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});

export default async function ReportPage({params}:{params:Promise<{id:string}>}){
  const user=await requireUser();const {id}=await params;
  const report=await db.expenseReport.findUnique({where:{id},include:{employee:true,expenses:{orderBy:{expenseDate:"asc"}},comments:{include:{author:true},orderBy:{createdAt:"asc"}}}});
  if(!report)notFound();
  if(user.role==="EMPLOYEE"&&report.employeeId!==user.id)redirect("/");
  const settings=await getNumericSettings();const totals=calculateReport(report,report.expenses,settings);
  const editable=report.employeeId===user.id&&["DRAFT","RETURNED"].includes(report.status);

  async function addExpense(fd:FormData){"use server";const u=await requireUser();const r=await db.expenseReport.findUniqueOrThrow({where:{id}});if(r.employeeId!==u.id||!["DRAFT","RETURNED"].includes(r.status))throw new Error("Nicht erlaubt");const p=expenseSchema.parse(Object.fromEntries(fd));const file=fd.get("file") as File;const upload=file?.size?await storeUpload(file):{};await db.expenseItem.create({data:{reportId:id,...p,...upload}});revalidatePath(`/reports/${id}`)}
  async function submit(){"use server";const u=await requireUser();const r=await db.expenseReport.findUniqueOrThrow({where:{id}});if(r.employeeId!==u.id||!["DRAFT","RETURNED"].includes(r.status))throw new Error("Nicht erlaubt");await db.expenseReport.update({where:{id},data:{status:"SUBMITTED",submittedAt:new Date()}});redirect("/")}
  async function remove(fd:FormData){"use server";const u=await requireUser();const reportId=String(fd.get("reportId"));const r=await db.expenseReport.findUniqueOrThrow({where:{id:reportId},include:{expenses:{select:{storedFileName:true}}}});if(r.employeeId!==u.id||!["DRAFT","RETURNED"].includes(r.status))throw new Error("Nicht erlaubt");await db.expenseReport.delete({where:{id:reportId}});await removeStoredFiles(r.expenses.map(x=>x.storedFileName));redirect("/")}
  async function addComment(fd:FormData){"use server";const u=await requireUser();const p=commentSchema.parse(Object.fromEntries(fd));await db.reviewComment.create({data:{reportId:id,authorId:u.id,text:p.text}});revalidatePath(`/reports/${id}`)}

  return <><div className="actions" style={{justifyContent:"space-between"}}><div><h1>{report.title}</h1><div className="sub">{report.employee.name} · {report.destination}</div></div><div className="actions"><a className="button secondary" href={`/api/reports/${id}/pdf`}>PDF</a>{editable&&<><Link className="button secondary" href={`/reports/${id}/edit`}>Bearbeiten</Link><form action={remove}><input name="reportId" type="hidden" value={id}/><ConfirmDeleteButton/></form><form action={submit}><button>Zur Prüfung senden</button></form></>}</div></div>
  <section className="grid two">
    <div className="card"><h2>Reise</h2><table><tbody><tr><th>Zeitraum</th><td>{report.startAt.toLocaleString("de-DE")} – {report.endAt.toLocaleString("de-DE")}</td></tr><tr><th>Zweck</th><td>{report.purpose}</td></tr><tr><th>Verkehrsmittel</th><td>{report.transportType}</td></tr><tr><th>Status</th><td><span className="badge">{report.status}</span></td></tr></tbody></table>
    <h2 style={{marginTop:22}}>Belege und Ausgaben</h2><table><thead><tr><th>Datum</th><th>Kategorie</th><th>Beschreibung</th><th>Zahlung</th><th>Betrag</th></tr></thead><tbody>{report.expenses.map(x=><tr key={x.id}><td>{x.expenseDate.toLocaleDateString("de-DE")}</td><td>{x.category}</td><td>{x.description}{x.storedFileName&&<> · <a href={`/api/files/${x.id}`}>Beleg</a></>}</td><td>{x.paymentType}</td><td>{eur.format(Number(x.amount))}</td></tr>)}</tbody></table>
    {editable&&<><h2 style={{marginTop:22}}>Ausgabe hinzufügen</h2><form action={addExpense}><div className="row"><div><label>Datum</label><input name="expenseDate" type="date" required/></div><div><label>Kategorie</label><select name="category"><option>Hotel</option><option>Bewirtung</option><option>Parken</option><option>Taxi</option><option>Bahn</option><option>Flug</option><option>Tanken</option><option>Sonstiges</option></select></div></div><div><label>Beschreibung</label><input name="description" required/></div><div className="row"><div><label>Betrag</label><input name="amount" type="number" step=".01" required/></div><div><label>enthaltene MwSt.</label><input name="vatAmount" type="number" step=".01" defaultValue="0"/></div></div><div><label>Zahlungsart</label><select name="paymentType"><option value="PRIVATE">Privat ausgelegt</option><option value="COMPANY_CARD">Firmenkarte</option><option value="CASH">Bar</option></select></div><div><label>Beleg</label><input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/></div><button>Ausgabe hinzufügen</button></form></>}</div>
    <div className="grid"><div className="card"><h2>Berechnung</h2><div className="summary"><span>Verpflegungspauschale</span><strong>{eur.format(totals.mealAllowance)}</strong><span>Kilometergeld</span><strong>{eur.format(totals.mileage)}</strong><span>Privat ausgelegt</span><strong>{eur.format(totals.privateExpenses)}</strong><span>Bar</span><strong>{eur.format(totals.cashExpenses)}</strong><span>Firmenkarte</span><strong>{eur.format(totals.companyCardExpenses)}</strong><hr/><hr/><span><strong>Erstattung Mitarbeiter</strong></span><strong>{eur.format(totals.reimbursement)}</strong><span>Gesamtkosten</span><strong>{eur.format(totals.totalCosts)}</strong></div></div>
    <div className="card"><h2>Kommentare</h2>{report.comments.length===0&&<p className="small">Noch keine Kommentare.</p>}{report.comments.map(c=><p key={c.id}><strong>{c.author.name}</strong><br/>{c.text}<br/><span className="small">{c.createdAt.toLocaleString("de-DE")}</span></p>)}<form action={addComment}><textarea name="text" placeholder="Kommentar hinzufügen" required/><button className="secondary">Kommentar speichern</button></form></div></div>
  </section></>
}
