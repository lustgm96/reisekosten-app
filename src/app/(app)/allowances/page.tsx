import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPerDiemRates } from "@/lib/settings";
import { perDiemSettingId } from "@/lib/per-diem";

export const dynamic = "force-dynamic";

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export default async function AllowancesPage() {
  const user = await requireUser();
  const rates = await getPerDiemRates();

  async function save(formData: FormData) {
    "use server";
    const actor = await requireUser();
    if (actor.role !== "ADMIN") throw new Error("Nicht erlaubt");

    const updates = rates.flatMap(rate =>
      (["fullDay", "partialDay", "overnight"] as const).map(field => {
        const id = perDiemSettingId(rate.code, field);
        const value = Number(formData.get(id));
        if (!Number.isFinite(value) || value < 0 || value > 500) {
          throw new Error(`Ungültiger Pauschalsatz für ${rate.label}`);
        }
        return db.appSetting.upsert({
          where: { id },
          update: { value: value.toFixed(2) },
          create: { id, value: value.toFixed(2) }
        });
      })
    );
    await db.$transaction(updates);
    revalidatePath("/allowances");
    revalidatePath("/");
  }

  return (
    <>
      <h1>Pauschalsätze</h1>
      <div className="sub">
        Verpflegungsmehraufwand nach den für 2026 veröffentlichten deutschen Regelungen
      </div>
      <div className="card" style={{ maxWidth: 900 }}>
        <form action={save}>
          <table>
            <thead>
              <tr>
                <th>Reiseland / Region</th>
                <th>24 Stunden</th>
                <th>An-/Abreise oder mehr als 8 Stunden</th>
                <th>Übernachtung</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(rate => (
                <tr key={rate.code}>
                  <td>{rate.label}</td>
                  <td>
                    {user.role === "ADMIN" ? (
                      <input
                        aria-label={`${rate.label}, 24 Stunden`}
                        defaultValue={rate.fullDay}
                        min="0"
                        name={perDiemSettingId(rate.code, "fullDay")}
                        step=".01"
                        type="number"
                      />
                    ) : (
                      eur.format(rate.fullDay)
                    )}
                  </td>
                  <td>
                    {user.role === "ADMIN" ? (
                      <input
                        aria-label={`${rate.label}, An- und Abreise`}
                        defaultValue={rate.partialDay}
                        min="0"
                        name={perDiemSettingId(rate.code, "partialDay")}
                        step=".01"
                        type="number"
                      />
                    ) : (
                      eur.format(rate.partialDay)
                    )}
                  </td>
                  <td>
                    {user.role === "ADMIN" ? (
                      <input
                        aria-label={`${rate.label}, Übernachtung`}
                        defaultValue={rate.overnight}
                        min="0"
                        name={perDiemSettingId(rate.code, "overnight")}
                        step=".01"
                        type="number"
                      />
                    ) : (
                      eur.format(rate.overnight)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {user.role === "ADMIN" && <button>Pauschalsätze speichern</button>}
        </form>
        <p className="small">
          Für die Schweiz werden Bern und Genf automatisch aus dem Zielort erkannt. Ansonsten
          gilt der Satz „Schweiz (übrige Orte)“. Kürzungen: Frühstück 20 %, Mittag- und
          Abendessen jeweils 40 % des jeweiligen 24-Stunden-Satzes. Die
          Übernachtungspauschalen gelten nur für eine Arbeitgebererstattung ohne
          Einzelnachweis.
        </p>
      </div>
    </>
  );
}
