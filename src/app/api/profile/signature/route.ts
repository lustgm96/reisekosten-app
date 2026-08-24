import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readStoredFile, removeStoredFiles, storeUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user || !user.signatureStoredFileName) notFound();

  const buffer = await readStoredFile(user.signatureStoredFileName);
  return new Response(Uint8Array.from(buffer), {
    headers: {
      "content-type": user.signatureMimeType || "image/png",
      "cache-control": "private, no-store"
    }
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });

  const formData = await request.formData();
  const signature = formData.get("signature");
  if (!(signature instanceof File) || !signature.size) {
    return NextResponse.json({ error: "Bitte unterschreiben." }, { status: 400 });
  }
  if (signature.type !== "image/png") {
    return NextResponse.json({ error: "Die Unterschrift muss als PNG übertragen werden." }, { status: 400 });
  }

  const upload = await storeUpload(signature);
  const previousSignature = user.signatureStoredFileName;

  await db.user.update({
    where: { id: user.id },
    data: { signatureStoredFileName: upload.storedFileName, signatureMimeType: upload.mimeType }
  });
  await removeStoredFiles([previousSignature]);

  return NextResponse.json({ saved: true });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Die Anmeldung ist abgelaufen. Bitte erneut anmelden." }, { status: 401 });

  const previousSignature = user.signatureStoredFileName;
  await db.user.update({
    where: { id: user.id },
    data: { signatureStoredFileName: null, signatureMimeType: null }
  });
  await removeStoredFiles([previousSignature]);

  return NextResponse.json({ saved: true });
}
