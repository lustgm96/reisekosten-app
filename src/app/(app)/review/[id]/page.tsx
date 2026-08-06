import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentSchema } from "@/lib/validation";
import { getNumericSettings, getPerDiemRates } from "@/lib/settings";
import { calculateReport } from "@/lib/calculation";
import { countryLabels, storedPerDiemRate } from "@/lib/per-diem";
import { withBasePath } from "@/lib/paths";
import { revalidatePath } from "next/cache";
import { formatTransportSelection } from "@/lib/transport";

const eur=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});

export default async function ReviewDetail({params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  if(user.role==="EMPLOYEE")redirect("/");
  const {id}=await params;

  const report=await db.expenseReport.findUnique({
    where:{id},
    include:{employee:true,expenses:true}
  });
  if(!report)notFound();
  if(report.status!=="SUBMITTED")redirect("/review");

  const rates=await getPerDiemRates();
  const rate=storedPerDiemRate(report,rates);
  const totals=calculateReport(report,report.expenses,await getNumericSettings(),rate);

  async function updateVat(fd:FormData){
    "use server";
    const actor=await requireUser();
    if(actor.role==="EMPLOYEE")throw new Error("Nicht erlaubt");
    const expenseId=String(fd.get("expenseId"));
    const expense=await db.expenseItem.findUniqueOrThrow({where:{id:expenseId},include:{report:true}});
    if(expense.reportId!==id||expense.report.status!=="SUBMITTED")throw new Error("Nicht erlaubt");
    const vatAmount=Number(String(fd.get("vatAmount")??"").replace(",","."));
    if(!Number.isFinite(vatAmount)||vatAmount<0||vatAmount>Number(expense.amount))throw new Error("Bitte einen gültigen MwSt.-Betrag angeben.");
    await db.expenseItem.update({where:{id:expenseId},data:{vatAmount}});
    revalidatePath(`/review/${id}`);
  }

  async function decide(fd:FormData){
    "use server";
    const actor=await requireUser();
    if(actor.role==="EMPLOYEE")throw new Error("Nicht erlaubt");
    const decision=String(fd.get("decision"));
    if(!["approve","return"].includes(decision))throw new Error("Ungültige Entscheidung");
    const text=String(fd.get("text")||"").trim();
    if(decision==="return"&&!text)throw new Error("Bei einer Rückgabe ist ein Kommentar erforderlich.");
    if(text)commentSchema.parse({text});

    await db.$transaction(async tx=>{
      const updated=await tx.expenseReport.updateMany({
        where:{id,status:"SUBMITTED"},
        data:decision==="approve"
          ? {status:"APPROVED",approvedAt:new Date()}
          : {status:"RETURNED",approvedAt:null,completedAt:null}
      });
      if(updated.count!==1)throw new Error("Die Abrechnung wurde bereits bearbeitet.");
      if(text){
        await tx.reviewComment.create({
          data:{reportId:id,authorId:actor.id,text}
        });
      }
    });
    redirect("/review");
  }

  return <><h1>Abrechnung prüfen</h1><div className="sub">{report.employee.name} · {report.title}</div>
  <section className="grid two">
    <div className="card">
      <h2>Reise</h2>
      <table><tbody>
        <tr><th>Ziel</th><td>{report.destination}, {countryLabels[report.countryCode as keyof typeof countryLabels] ?? report.countryCode}</td></tr>
        <tr><th>Pauschalsatz</th><td>{rate.label}</td></tr>
        <tr><th>Übernachtung</th><td>{report.accommodationMode==="PER_DIEM"?`Pauschale (${eur.format(Number(report.perDiemOvernight))} je Nacht)`:report.accommodationMode==="PROVIDED"?"Gestellt / keine Erstattung":"Tatsächliche Kosten laut Beleg"}</td></tr>
        <tr><th>Zeitraum</th><td>{report.startAt.toLocaleString("de-DE")} – {report.endAt.toLocaleString("de-DE")}</td></tr>
        <tr><th>Zweck</th><td>{report.purpose}</td></tr>
        <tr><th>Verkehrsmittel</th><td>{formatTransportSelection(report.transportType)}</td></tr>
      </tbody></table>

      <h2 style={{marginTop:22}}>Ausgaben</h2>
      <table><thead><tr><th>Datum</th><th>Beschreibung</th><th>Zahlung</th><th>MwSt.</th><th>Betrag</th></tr></thead><tbody>
      {report.expenses.map(x=><tr key={x.id}>
        <td>{x.expenseDate.toLocaleDateString("de-DE")}</td>
        <td>{x.description}{x.storedFileName&&<> · <a href={withBasePath(`/api/files/${x.id}`)}>Beleg</a></>}</td>
        <td>{x.paymentType}</td>
        <td><form action={updateVat} className="table-actions"><input name="expenseId" type="hidden" value={x.id}/><input aria-label={`MwSt. für ${x.description}`} min="0" max={x.amount.toString()} name="vatAmount" step=".01" style={{minWidth:90}} type="number" defaultValue={x.vatAmount.toString()}/><button className="secondary">Speichern</button></form></td>
        <td>{eur.format(Number(x.amount))}</td>
      </tr>)}
      </tbody></table>
    </div>

    <div className="grid">
      <div className="card"><h2>Zusammenfassung</h2><div className="summary">
        <span>Verpflegung</span><strong>{eur.format(totals.mealAllowance)}</strong>
        <span>Übernachtungspauschale</span><strong>{eur.format(totals.lodgingAllowance)}</strong>
        <span>Kilometergeld</span><strong>{eur.format(totals.mileage)}</strong>
        <span>Privat ausgelegt</span><strong>{eur.format(totals.privateExpenses)}</strong>
        <span>Firmenkarte</span><strong>{eur.format(totals.companyCardExpenses)}</strong>
        <hr/><hr/>
        <span><strong>Erstattung</strong></span><strong>{eur.format(totals.reimbursement)}</strong>
      </div></div>

      <div className="card"><h2>Entscheidung</h2>
        <form action={decide}>
          <textarea name="text" placeholder="Kommentar (bei Rückgabe erforderlich)"/>
          <div className="actions">
            <button name="decision" value="approve">Freigeben</button>
            <button className="danger" name="decision" value="return">Zurückgeben</button>
          </div>
        </form>
      </div>
    </div>
  </section></>
}
