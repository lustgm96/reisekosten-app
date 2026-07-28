import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const {id}=await params;
  const item=await db.expenseItem.findUnique({
    where:{id},
    include:{report:true}
  });

  if(!item||!item.storedFileName)notFound();
  if(user.role==="EMPLOYEE"&&item.report.employeeId!==user.id)notFound();

  const uploadDir=process.env.UPLOAD_DIR||"./storage/uploads";
  const buffer=await fs.readFile(path.join(uploadDir,item.storedFileName));

  return new Response(buffer,{
    headers:{
      "content-type":item.mimeType||"application/octet-stream",
      "content-disposition":`inline; filename="${encodeURIComponent(item.originalFileName||"beleg")}"`
    }
  });
}
