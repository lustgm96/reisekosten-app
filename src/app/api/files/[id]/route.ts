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
  let buffer: Buffer;
  try {
    buffer=await fs.readFile(path.join(uploadDir,path.basename(item.storedFileName)));
  } catch (error) {
    if((error as NodeJS.ErrnoException).code==="ENOENT")notFound();
    throw error;
  }

  return new Response(Uint8Array.from(buffer),{
    headers:{
      "content-type":item.mimeType||"application/octet-stream",
      "content-disposition":`inline; filename*=UTF-8''${encodeURIComponent(item.originalFileName||"beleg")}`,
      "cache-control":"private, no-store"
    }
  });
}
