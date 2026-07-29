import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic="force-dynamic";

export default async function Settings(){
  const user=await requireUser();
  if(user.role!=="ADMIN")redirect("/");

  const settings=Object.fromEntries((await db.appSetting.findMany()).map(x=>[x.id,x.value]));

  async function save(fd:FormData){
    "use server";
    const actor=await requireUser();
    if(actor.role!=="ADMIN")throw new Error("Nicht erlaubt");

    for(const [id,value] of Object.entries(Object.fromEntries(fd))){
      await db.appSetting.upsert({
        where:{id},
        update:{value:String(value)},
        create:{id,value:String(value)}
      });
    }
    revalidatePath("/settings");
  }

  return <><h1>Einstellungen</h1><div className="sub">Nur die Werte, die ihr im Alltag wirklich braucht</div>
  <div className="card" style={{maxWidth:850}}><form action={save}>
    <div><label>Firmenname</label><input name="companyName" defaultValue={settings.companyName}/></div>
    <div><label>Kilometerpauschale</label><input name="mileageRate" type="number" step=".01" defaultValue={settings.mileageRate}/></div>
    <button>Speichern</button>
  </form>
  <p className="small">Verpflegungssätze werden im eigenen Bereich gepflegt.</p>
  <Link className="button secondary" href="/allowances">Pauschalsätze öffnen</Link>
  </div></>
}
