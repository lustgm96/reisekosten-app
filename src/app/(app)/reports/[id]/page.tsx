import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentSchema } from "@/lib/validation";
import { removeStoredFiles } from "@/lib/storage";
import { getNumericSettings, getPerDiemRates } from "@/lib/settings";
import { calculateReport } from "@/lib/calculation";
import { countryLabels, storedPerDiemRate } from "@/lib/per-diem";
import { ConfirmDeleteButton } from "./confirm-delete-button";
import { ReceiptPreview } from "./receipt-preview";
import { withBasePath } from "@/lib/paths";
import { StatusBadge } from "../../status-badge";
import { ConfirmActionButton } from "./confirm-action-button";
import { getCompletionError } from "@/lib/report-workflow";
import { ExpenseForm } from "./expense-form";
import { receiptDocumentTitle } from "@/lib/process-number";
import { countProvidedMeals, validateProvidedMeals } from "@/lib/provided-meals";
import { ProvidedMealsForm } from "./provided-meals-form";
import { formatTransportSelection } from "@/lib/transport";
import { canEmployeeEditReport } from "@/lib/report-editing";
import { formatCurrencyAmount, toEur } from "@/lib/currency";

export const dynamic="force-dynamic";
const eur=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});

export default async function ReportPage({params}:{params:Promise<{id:string}>}){
  const user=await requireUser();const {id}=await params;
  const report=await db.expenseReport.findUnique({where:{id},include:{employee:true,expenses:{orderBy:[{expenseDate:"asc"},{createdAt:"asc"}]},comments:{include:{author:true},orderBy:{createdAt:"asc"}}}});
  if(!report)notFound();
  if(user.role==="EMPLOYEE"&&report.employeeId!==user.id)redirect("/");
  const settings=await getNumericSettings();const rates=await getPerDiemRates();const rate=storedPerDiemRate(report,rates);const totals=calculateReport(report,report.expenses,settings,rate);
  const editable=canEmployeeEditReport(user.id,report.employeeId,report.status);

  async function submit(){"use server";const u=await requireUser();const r=await db.expenseReport.findUniqueOrThrow({where:{id}});if(!canEmployeeEditReport(u.id,r.employeeId,r.status))throw new Error("Nicht erlaubt");if(!r.mealsReviewedAt)throw new Error("Bitte gestellte Mahlzeiten vor dem Einreichen prüfen und speichern.");await db.expenseReport.update({where:{id},data:{status:"SUBMITTED",submittedAt:new Date()}});redirect("/")}
  async function remove(fd:FormData){"use server";const u=await requireUser();const reportId=String(fd.get("reportId"));const r=await db.expenseReport.findUniqueOrThrow({where:{id:reportId},include:{expenses:{select:{storedFileName:true}}}});if(!canEmployeeEditReport(u.id,r.employeeId,r.status))throw new Error("Nicht erlaubt");await db.expenseReport.delete({where:{id:reportId}});await removeStoredFiles(r.expenses.map(x=>x.storedFileName));redirect("/")}
  async function removeExpense(fd:FormData){"use server";const u=await requireUser();const reportId=String(fd.get("reportId"));const expenseId=String(fd.get("expenseId"));const expense=await db.expenseItem.findUniqueOrThrow({where:{id:expenseId},include:{report:true}});if(expense.reportId!==reportId||!canEmployeeEditReport(u.id,expense.report.employeeId,expense.report.status))throw new Error("Nicht erlaubt");await db.expenseItem.delete({where:{id:expenseId}});await removeStoredFiles([expense.storedFileName]);revalidatePath(`/reports/${reportId}`)}
  async function addComment(fd:FormData){"use server";const u=await requireUser();const p=commentSchema.parse(Object.fromEntries(fd));await db.reviewComment.create({data:{reportId:id,authorId:u.id,text:p.text}});revalidatePath(`/reports/${id}`)}
  async function saveProvidedMeals(fd:FormData){"use server";const u=await requireUser();const r=await db.expenseReport.findUniqueOrThrow({where:{id}});if(!canEmployeeEditReport(u.id,r.employeeId,r.status))throw new Error("Nicht erlaubt");const meals=validateProvidedMeals(fd.getAll("meals").map(String),r.startAt,r.endAt);await db.expenseReport.update({where:{id},data:{providedMealsJson:JSON.stringify(meals),...countProvidedMeals(meals),mealsReviewedAt:new Date()}});revalidatePath(`/reports/${id}`)}
  async function complete(){"use server";const u=await requireUser();const current=await db.expenseReport.findUniqueOrThrow({where:{id}});const error=getCompletionError(u.role,current.status);if(error)throw new Error(error);const updated=await db.expenseReport.updateMany({where:{id,status:"APPROVED"},data:{status:"COMPLETED",completedAt:new Date()}});if(updated.count!==1)throw new Error("Die Abrechnung wurde bereits bearbeitet.");redirect("/archive")}

  return <><div className="actions" style={{justifyContent:"space-between"}}><div><h1>{report.title}</h1><div className="sub">{report.employee.name} · {report.destination} · Vorgangsnummer <strong>{report.processNumber}</strong></div></div><div className="actions report-actions">
    <div className="actions">
      <a className="button secondary" href={withBasePath(`/api/reports/${id}/pdf`)}>PDF</a>
      {editable&&<Link className="button secondary" href={`/reports/${id}/edit`}>Bearbeiten</Link>}
    </div>
    {editable&&<div className="actions">
      <form action={remove}><input name="reportId" type="hidden" value={id}/><ConfirmDeleteButton className="danger danger-outline"/></form>
      <form action={submit}><button className="button-lg">Zur Prüfung senden</button></form>
    </div>}
    {user.role==="ADMIN"&&report.status==="APPROVED"&&<div className="actions"><form action={complete}><ConfirmActionButton label="Als ausgezahlt abschließen" message="Diese Abrechnung als ausgezahlt und abgeschlossen markieren?"/></form></div>}
  </div></div>
  <section className="grid two">
    <div className="card"><h2>Reise</h2><table><tbody><tr><th>Ziel</th><td>{report.destination}, {countryLabels[report.countryCode as keyof typeof countryLabels] ?? report.countryCode}</td></tr><tr><th>Pauschalsatz</th><td>{rate.label}</td></tr><tr><th>Übernachtung</th><td>{report.accommodationMode==="PER_DIEM"?`Pauschale (${eur.format(Number(report.perDiemOvernight))} je Nacht)`:report.accommodationMode==="PROVIDED"?"Gestellt / keine Erstattung":"Tatsächliche Kosten laut Beleg"}</td></tr><tr><th>Zeitraum</th><td>{report.startAt.toLocaleString("de-DE")} – {report.endAt.toLocaleString("de-DE")}</td></tr><tr><th>Zweck</th><td>{report.purpose}</td></tr><tr><th>Verkehrsmittel</th><td>{formatTransportSelection(report.transportType)}</td></tr><tr><th>Status</th><td><StatusBadge status={report.status}/></td></tr>{report.approvedAt&&<tr><th>Freigegeben am</th><td>{report.approvedAt.toLocaleString("de-DE")}</td></tr>}{report.completedAt&&<tr><th>Abgeschlossen am</th><td>{report.completedAt.toLocaleString("de-DE")}</td></tr>}</tbody></table>
    <h2 style={{marginTop:22}}>Belege und Ausgaben</h2><table><thead><tr><th>Datum</th><th>Kategorie</th><th>Beschreibung</th><th>Beleg</th><th>Zahlung</th><th>Netto</th><th>MwSt. 7%</th><th>MwSt. 19%</th><th>Trinkgeld</th><th>Betrag</th>{editable&&<th>Aktionen</th>}</tr></thead><tbody>{report.expenses.map((x,index)=><tr key={x.id}><td>{x.expenseDate.toLocaleDateString("de-DE")}</td><td>{x.category}</td><td>{x.description}{x.category==="Bewirtung"&&<div className="small">Kunde: {x.bewirtungKunde||"-"}<br/>Teilnehmer: {x.bewirtungTeilnehmer||"-"}<br/>Anlass: {x.bewirtungAnlass||"-"}</div>}{x.notes&&<div className="small">Hinweis: {x.notes}</div>}</td><td>{x.storedFileName?<ReceiptPreview fileName={receiptDocumentTitle(report.processNumber,x.createdAt,index)} mimeType={x.mimeType} url={withBasePath(`/api/files/${x.id}`)}/>:<span className="small">Kein Beleg</span>}</td><td>{x.paymentType}</td><td>{eur.format(Number(x.netAmount))}</td><td>{eur.format(Number(x.vat7Amount))}</td><td>{eur.format(Number(x.vat19Amount))}</td><td>{eur.format(Number(x.tip))}</td><td>{eur.format(toEur(x.amount,x.exchangeRate))}{x.currency!=="EUR"&&<div className="small">{formatCurrencyAmount(Number(x.amount),x.currency)} · Kurs {Number(x.exchangeRate).toFixed(4)}</div>}</td>{editable&&<td><div className="table-actions"><Link href={`/reports/${id}/expenses/${x.id}/edit`}>Bearbeiten</Link><form action={removeExpense}><input name="reportId" type="hidden" value={id}/><input name="expenseId" type="hidden" value={x.id}/><ConfirmDeleteButton label="Entfernen" message="Diese Ausgabe und den zugehörigen Beleg löschen?"/></form></div></td>}</tr>)}</tbody></table>
    {editable&&<><h2 style={{marginTop:22}}>Gestellte Mahlzeiten</h2><ProvidedMealsForm action={saveProvidedMeals} endAt={report.endAt} legacyMealCount={report.breakfasts+report.lunches+report.dinners} reviewedAt={report.mealsReviewedAt} startAt={report.startAt} value={report.providedMealsJson}/><h2 style={{marginTop:22}}>Ausgaben aus Belegen erfassen</h2><ExpenseForm analyzeUrl={withBasePath("/api/receipts/analyze/")} reportId={id} saveUrl={withBasePath(`/api/reports/${id}/expenses/`)}/></>}</div>
    <div className="grid"><div className="card"><h2>Berechnung</h2><div className="summary"><span>Verpflegungspauschale</span><strong>{eur.format(totals.mealAllowance)}</strong><span>Übernachtungspauschale</span><strong>{eur.format(totals.lodgingAllowance)}</strong><span>Kilometergeld</span><strong>{eur.format(totals.mileage)}</strong><span>Privat ausgelegt</span><strong>{eur.format(totals.privateExpenses)}</strong><span>Bar</span><strong>{eur.format(totals.cashExpenses)}</strong><span>Firmenkarte</span><strong>{eur.format(totals.companyCardExpenses)}</strong><hr/><hr/><span><strong>Erstattung Mitarbeiter</strong></span><strong>{eur.format(totals.reimbursement)}</strong><span>Gesamtkosten</span><strong>{eur.format(totals.totalCosts)}</strong></div></div>
    <div className="card"><h2>Kommentare</h2>{report.comments.length===0&&<p className="small">Noch keine Kommentare.</p>}{report.comments.map(c=><p key={c.id}><strong>{c.author.name}</strong><br/>{c.text}<br/><span className="small">{c.createdAt.toLocaleString("de-DE")}</span></p>)}<form action={addComment}><textarea name="text" placeholder="Kommentar hinzufügen" required/><button className="secondary">Kommentar speichern</button></form></div></div>
  </section></>
}
