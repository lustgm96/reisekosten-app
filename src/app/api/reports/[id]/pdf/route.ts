import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyName, getNumericSettings } from "@/lib/settings";
import { calculateReport } from "@/lib/calculation";

const eur=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"});

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const {id}=await params;
  const report=await db.expenseReport.findUnique({
    where:{id},
    include:{employee:true,expenses:{orderBy:{expenseDate:"asc"}},comments:{include:{author:true},orderBy:{createdAt:"asc"}}}
  });

  if(!report)notFound();
  if(user.role==="EMPLOYEE"&&report.employeeId!==user.id)notFound();

  const totals=calculateReport(report,report.expenses,await getNumericSettings());
  const company=await getCompanyName();

  const pdf=await PDFDocument.create();
  let page=pdf.addPage([595,842]);
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let y=790;

  const line=(text:string,size=10,font=regular)=>{
    if(y<55){page=pdf.addPage([595,842]);y=790}
    page.drawText(text,{x:45,y,size,font,color:rgb(0.08,0.11,0.18)});
    y-=size+8;
  };

  line(company,11,bold);
  line("Reisekostenabrechnung",20,bold);
  y-=5;
  line(`Mitarbeiter: ${report.employee.name}`);
  line(`Abrechnung: ${report.title}`);
  line(`Reisezweck: ${report.purpose}`);
  line(`Ziel: ${report.destination}`);
  line(`Zeitraum: ${report.startAt.toLocaleString("de-DE")} - ${report.endAt.toLocaleString("de-DE")}`);
  line(`Verkehrsmittel: ${report.transportType}`);
  line(`Status: ${report.status}`);
  y-=10;
  line("Ausgaben",14,bold);

  for(const item of report.expenses){
    line(`${item.expenseDate.toLocaleDateString("de-DE")} | ${item.category} | ${item.description} | ${item.paymentType} | ${eur.format(Number(item.amount))}`,9);
  }

  y-=10;
  line("Berechnung",14,bold);
  line(`Verpflegungspauschale: ${eur.format(totals.mealAllowance)}`);
  line(`Kilometergeld: ${eur.format(totals.mileage)}`);
  line(`Privat ausgelegt: ${eur.format(totals.privateExpenses)}`);
  line(`Bar ausgelegt: ${eur.format(totals.cashExpenses)}`);
  line(`Firmenkarte: ${eur.format(totals.companyCardExpenses)}`);
  line(`Erstattung an Mitarbeiter: ${eur.format(totals.reimbursement)}`,11,bold);
  line(`Gesamtkosten: ${eur.format(totals.totalCosts)}`,11,bold);

  if(report.approvedAt){
    y-=10;
    line(`Digital freigegeben am ${report.approvedAt.toLocaleString("de-DE")}`,10,bold);
  }

  if(report.comments.length){
    y-=10;
    line("Kommentare",14,bold);
    for(const comment of report.comments){
      line(`${comment.author.name}: ${comment.text}`,9);
    }
  }

  const bytes=await pdf.save();
  return new Response(Uint8Array.from(bytes),{
    headers:{
      "content-type":"application/pdf",
      "content-disposition":`attachment; filename="reisekosten-${report.id}.pdf"`
    }
  });
}
