import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyName, getNumericSettings } from "@/lib/settings";
import { createReportPdf } from "@/lib/report-pdf";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const {id}=await params;
  const report=await db.expenseReport.findUnique({
    where:{id},
    include:{employee:true,expenses:{orderBy:{expenseDate:"asc"}},comments:{include:{author:true},orderBy:{createdAt:"asc"}}}
  });

  if(!report)notFound();
  if(user.role==="EMPLOYEE"&&report.employeeId!==user.id)notFound();

  const bytes=await createReportPdf(
    report,
    await getNumericSettings(),
    await getCompanyName()
  );
  return new Response(Uint8Array.from(bytes),{
    headers:{
      "content-type":"application/pdf",
      "content-disposition":`attachment; filename="reisekosten-${report.id}.pdf"`
    }
  });
}
