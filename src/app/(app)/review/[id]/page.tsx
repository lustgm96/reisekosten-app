import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commentSchema } from "@/lib/validation";
import { getNumericSettings } from "@/lib/settings";
import { calculateReport } from "@/lib/calculation";

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

  const totals=calculateReport(report,report.expenses,await getNumericSettings());

  async function decide(fd:FormData){
    "use server";
    const actor=await requireUser();
    if(actor.role==="EMPLOYEE")throw new Error("Nicht erlaubt");
    const decision=String(fd.get("decision"));
    const text=String(fd.get("text")||"").trim();
    if(text)commentSchema.parse({text});

    await db.$transaction(async tx=>{
      if(text){
        await tx.reviewComment.create({
          data:{reportId:id,authorId:actor.id,text}
        });
      }
      await tx.expenseReport.update({
        where:{id},
        data:decision==="approve"
          ? {status:"APPROVED",approvedAt:new Date()}
          : {status:"RETURNED"}
      });
    });
    redirect("/review");
  }

  return <><h1>Abrechnung prüfen</h1><div className="sub">{report.employee.name} · {report.title}</div>
  <section className="grid two">
    <div className="card">
      <h2>Reise</h2>
      <table><tbody>
        <tr><th>Ziel</th><td>{report.destination}</td></tr>
        <tr><th>Zeitraum</th><td>{report.startAt.toLocaleString("de-DE")} – {report.endAt.toLocaleString("de-DE")}</td></tr>
        <tr><th>Zweck</th><td>{report.purpose}</td></tr>
      </tbody></table>

      <h2 style={{marginTop:22}}>Ausgaben</h2>
      <table><thead><tr><th>Datum</th><th>Beschreibung</th><th>Zahlung</th><th>Betrag</th></tr></thead><tbody>
      {report.expenses.map(x=><tr key={x.id}>
        <td>{x.expenseDate.toLocaleDateString("de-DE")}</td>
        <td>{x.description}{x.storedFileName&&<> · <a href={`/api/files/${x.id}`}>Beleg</a></>}</td>
        <td>{x.paymentType}</td>
        <td>{eur.format(Number(x.amount))}</td>
      </tr>)}
      </tbody></table>
    </div>

    <div className="grid">
      <div className="card"><h2>Zusammenfassung</h2><div className="summary">
        <span>Verpflegung</span><strong>{eur.format(totals.mealAllowance)}</strong>
        <span>Kilometergeld</span><strong>{eur.format(totals.mileage)}</strong>
        <span>Privat ausgelegt</span><strong>{eur.format(totals.privateExpenses)}</strong>
        <span>Firmenkarte</span><strong>{eur.format(totals.companyCardExpenses)}</strong>
        <hr/><hr/>
        <span><strong>Erstattung</strong></span><strong>{eur.format(totals.reimbursement)}</strong>
      </div></div>

      <div className="card"><h2>Entscheidung</h2>
        <form action={decide}>
          <textarea name="text" placeholder="Kommentar, besonders bei Rückgabe"/>
          <div className="actions">
            <button name="decision" value="approve">Freigeben</button>
            <button className="danger" name="decision" value="return">Zurückgeben</button>
          </div>
        </form>
      </div>
    </div>
  </section></>
}
