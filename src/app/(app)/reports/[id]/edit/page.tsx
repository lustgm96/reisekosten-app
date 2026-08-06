import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportSchema } from "@/lib/validation";
import { notFound, redirect } from "next/navigation";
import { withBasePath } from "@/lib/paths";
import { getPerDiemRates } from "@/lib/settings";
import { countryOptions, resolvePerDiemRate } from "@/lib/per-diem";
import { TransportFields } from "../../transport-fields";

const editableStatuses = ["DRAFT", "RETURNED"] as const;

function dateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  ].join("T");
}

export default async function EditReport({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const report = await db.expenseReport.findUnique({ where: { id } });

  if (!report) notFound();
  if (
    report.employeeId !== user.id ||
    !editableStatuses.includes(report.status as (typeof editableStatuses)[number])
  ) {
    redirect(`/reports/${id}`);
  }

  async function update(formData: FormData) {
    "use server";
    const actor = await requireUser();
    const current = await db.expenseReport.findUniqueOrThrow({ where: { id } });

    if (
      current.employeeId !== actor.id ||
      !editableStatuses.includes(current.status as (typeof editableStatuses)[number])
    ) {
      throw new Error("Nicht erlaubt");
    }

    const values = reportSchema.parse(Object.fromEntries(formData));
    const rate = resolvePerDiemRate(
      values.countryCode,
      values.destination,
      await getPerDiemRates()
    );
    if (
      values.accommodationMode === "PER_DIEM" &&
      (await db.expenseItem.count({ where: { reportId: id, category: "Hotel" } })) > 0
    ) {
      throw new Error(
        "Für die Übernachtungspauschale müssen vorhandene Hotelbelege zuerst entfernt werden."
      );
    }
    await db.expenseReport.update({
      where: { id },
      data: {
        ...values,
        perDiemCode: rate.code,
        perDiemFullDay: rate.fullDay,
        perDiemPartialDay: rate.partialDay,
        perDiemOvernight: rate.overnight,
        breakfasts: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.breakfasts : 0,
        lunches: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.lunches : 0,
        dinners: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.dinners : 0,
        providedMealsJson: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.providedMealsJson : "[]",
        mealsReviewedAt: current.startAt.getTime() === values.startAt.getTime() && current.endAt.getTime() === values.endAt.getTime() ? current.mealsReviewedAt : null
      }
    });
    redirect(`/reports/${id}`);
  }

  return (
    <>
      <h1>Abrechnung bearbeiten</h1>
      <div className="sub">Reisedaten und Pauschalangaben anpassen</div>
      <div className="card" style={{ maxWidth: 850 }}>
        <form action={update}>
          <div>
            <label>Titel</label>
            <input name="title" defaultValue={report.title} required />
          </div>
          <div>
            <label>Übernachtung abrechnen</label>
            <select name="accommodationMode" defaultValue={report.accommodationMode}>
              <option value="ACTUAL">Tatsächliche Hotelkosten laut Beleg</option>
              <option value="PER_DIEM">Übernachtungspauschale ohne Hotelbeleg</option>
              <option value="PROVIDED">Vom Arbeitgeber gestellt / keine Erstattung</option>
            </select>
          </div>
          <div>
            <label>Reisezweck</label>
            <textarea name="purpose" defaultValue={report.purpose} required />
          </div>
          <div className="row">
            <div>
              <label>Reiseland</label>
              <select name="countryCode" defaultValue={report.countryCode}>
                {countryOptions.map(country => (
                  <option key={country.code} value={country.code}>{country.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Zielort</label>
              <input name="destination" defaultValue={report.destination} required />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Beginn</label>
              <input
                name="startAt"
                type="datetime-local"
                defaultValue={dateTimeLocalValue(report.startAt)}
                required
              />
            </div>
            <div>
              <label>Ende</label>
              <input
                name="endAt"
                type="datetime-local"
                defaultValue={dateTimeLocalValue(report.endAt)}
                required
              />
            </div>
          </div>
          <TransportFields defaultKilometers={report.privateKilometers} defaultValue={report.transportType}/>
          <div className="actions">
            <button>Änderungen speichern</button>
            <a className="button secondary" href={withBasePath(`/reports/${id}`)}>
              Abbrechen
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
