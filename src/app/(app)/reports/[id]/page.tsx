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
import { ReceiptPreview } from "./receipt-preview";
import { withBasePath } from "@/lib/paths";
import { StatusBadge } from "../../status-badge";
import { ConfirmActionButton } from "./confirm-action-button";
import { getCompletionError } from "@/lib/report-workflow";
import { ExpenseForm } from "./expense-form";

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
  async function removeExpense(fd:FormData){"use server";const u=await requireUser();const reportId=String(fd.get("reportId"));const expenseId=String(fd.get("expenseId"));const expense=await db.expenseItem.findUniqueOrThrow({where:{id:expenseId},include:{report:true}});if(expense.reportId!==reportId||expense.report.employeeId!==u.id||!["DRAFT","RETURNED"].includes(expense.report.status))throw new Error("Nicht erlaubt");await db.expenseItem.delete({where:{id:expenseId}});await removeStoredFiles([expense.storedFileName]);revalidatePath(`/reports/${reportId}`)}
  async function addComment(fd:FormData){"use server";const u=await requireUser();const p=commentSchema.parse(Object.fromEntries(fd));await db.reviewComment.create({data:{reportId:id,authorId:u.id,text:p.text}});revalidatePath(`/reports/${id}`)}
  async function complete(){"use server";const u=await requireUser();const current=await db.expenseReport.findUniqueOrThrow({where:{id}});const error=getCompletionError(u.role,current.status);if(error)throw new Error(error);const updated=await db.expenseReport.updateMany({where:{id,status:"APPROVED"},data:{status:"COMPLETED",completedAt:new Date()}});if(updated.count!==1)throw new Error("Die Abrechnung wurde bereits bearbeitet.");redirect("/archive")}

  return <><div className="actions" style={{justifyContent:"space-between"}}><div><h1>{report.title}</h1><div className="sub">{report.employee.name} · {report.destination}</div></div><div className="actions"><a className="button secondary" href={withBasePath(`/api/reports/${id}/pdf`)}>PDF</a>{user.role==="ADMIN"&&report.status==="APPROVED"&&<form action={complete}><ConfirmActionButton label="Als ausgezahlt abschließen" message="Diese Abrechnung als ausgezahlt und abgeschlossen markieren?"/></form>}{editable&&<><Link className="button secondary" href={`/reports/${id}/edit`}>Bearbeiten</Link><form action={remove}><input name="reportId" type="hidden" value={id}/><ConfirmDeleteButton/></form><form action={submit}><button>Zur Prüfung senden</button></form></>}</div></div>
  <section className="grid two">
    <div className="card"><h2>Reise</h2><table><tbody><tr><th>Zeitraum</th><td>{report.startAt.toLocaleString("de-DE")} – {report.endAt.toLocaleString("de-DE")}</td></tr><tr><th>Zweck</th><td>{report.purpose}</td></tr><tr><th>Verkehrsmittel</th><td>{report.transportType}</td></tr><tr><th>Status</th><td><StatusBadge status={report.status}/></td></tr>{report.approvedAt&&<tr><th>Freigegeben am</th><td>{report.approvedAt.toLocaleString("de-DE")}</td></tr>}{report.completedAt&&<tr><th>Abgeschlossen am</th><td>{report.completedAt.toLocaleString("de-DE")}</td></tr>}</tbody></table>
    <h2 style={{marginTop:22}}>Belege und Ausgaben</h2><table><thead><tr><th>Datum</th><th>Kategorie</th><th>Beschreibung</th><th>Beleg</th><th>Zahlung</th><th>Betrag</th>{editable&&<th>Aktionen</th>}</tr></thead><tbody>{report.expenses.map(x=><tr key={x.id}><td>{x.expenseDate.toLocaleDateString("de-DE")}</td><td>{x.category}</td><td>{x.description}</td><td>{x.storedFileName?<ReceiptPreview fileName={x.originalFileName||"Beleg"} mimeType={x.mimeType} url={withBasePath(`/api/files/${x.id}`)}/>:<span className="small">Kein Beleg</span>}</td><td>{x.paymentType}</td><td>{eur.format(Number(x.amount))}</td>{editable&&<td><div className="table-actions"><Link href={`/reports/${id}/expenses/${x.id}/edit`}>Bearbeiten</Link><form action={removeExpense}><input name="reportId" type="hidden" value={id}/><input name="expenseId" type="hidden" value={x.id}/><ConfirmDeleteButton label="Entfernen" message="Diese Ausgabe und den zugehörigen Beleg löschen?"/></form></div></td>}</tr>)}</tbody></table>
    {editable&&<><h2 style={{marginTop:22}}>Ausgabe hinzufügen</h2><ExpenseForm action={addExpense} analyzeUrl={withBasePath("/api/receipts/analyze/")} reportId={id}/></>}</div>
    <div className="grid"><div className="card"><h2>Berechnung</h2><div className="summary"><span>Verpflegungspauschale</span><strong>{eur.format(totals.mealAllowance)}</strong><span>Kilometergeld</span><strong>{eur.format(totals.mileage)}</strong><span>Privat ausgelegt</span><strong>{eur.format(totals.privateExpenses)}</strong><span>Bar</span><strong>{eur.format(totals.cashExpenses)}</strong><span>Firmenkarte</span><strong>{eur.format(totals.companyCardExpenses)}</strong><hr/><hr/><span><strong>Erstattung Mitarbeiter</strong></span><strong>{eur.format(totals.reimbursement)}</strong><span>Gesamtkosten</span><strong>{eur.format(totals.totalCosts)}</strong></div></div>
    <div className="card"><h2>Kommentare</h2>{report.comments.length===0&&<p className="small">Noch keine Kommentare.</p>}{report.comments.map(c=><p key={c.id}><strong>{c.author.name}</strong><br/>{c.text}<br/><span className="small">{c.createdAt.toLocaleString("de-DE")}</span></p>)}<form action={addComment}><textarea name="text" placeholder="Kommentar hinzufügen" required/><button className="secondary">Kommentar speichern</button></form></div></div>
  </section></>
}
