import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await requireUser();
  const {id}=await params;
  const item=await db.expenseItem.findUnique({
    where:{id},
    include:{report:true}
  });

  if(!item||!item.storedFileName)notFound();
  if(user.role==="EMPLOYEE"&&item.report.employeeId!==user.id)notFound();

  let buffer: Buffer;
  try {
    buffer=await readStoredFile(item.storedFileName);
  } catch (error) {
    if((error as NodeJS.ErrnoException).code==="ENOENT"||(error instanceof Error&&error.message==="Datei nicht gefunden."))notFound();
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
