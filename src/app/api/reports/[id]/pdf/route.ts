import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyName, getNumericSettings, getPerDiemRates } from "@/lib/settings";
import { appendReceiptsToReportPdf, createReportPdf } from "@/lib/report-pdf";
import { storedPerDiemRate } from "@/lib/per-diem";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const {id}=await params;
  const report=await db.expenseReport.findUnique({
    where:{id},
    include:{employee:true,expenses:{orderBy:[{expenseDate:"asc"},{createdAt:"asc"}]},comments:{include:{author:true},orderBy:{createdAt:"asc"}}}
  });

  if(!report)notFound();
  if(user.role==="EMPLOYEE"&&report.employeeId!==user.id)notFound();

  const rates=await getPerDiemRates();
  const rate=storedPerDiemRate(report,rates);
  const summary=await createReportPdf(report,await getNumericSettings(),await getCompanyName(),rate);
  const attachments=[];
  for(const [documentIndex,expense] of report.expenses.entries()){if(expense.storedFileName&&expense.mimeType){attachments.push({bytes:await readStoredFile(expense.storedFileName),createdAt:expense.createdAt,documentIndex,mimeType:expense.mimeType})}}
  const bytes=await appendReceiptsToReportPdf(summary,report.processNumber,attachments);
  return new Response(Uint8Array.from(bytes),{
    headers:{
      "content-type":"application/pdf",
      "content-disposition":`attachment; filename="${report.processNumber}-Reisekosten.pdf"`
    }
  });
}
